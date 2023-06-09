import { Injectable } from '@nestjs/common';
import * as PixelfedInstance from 'mastodon-api';
import {
  DefaultOptions,
  FileRecord,
  FileSubmission,
  FileSubmissionType,
  PixelfedAccountData,
  PixelfedFileOptions,
  PostResponse,
  Submission,
  SubmissionPart,
  SubmissionRating,
} from 'postybirb-commons';
import UserAccountEntity from 'src/server//account/models/user-account.entity';
import { PlaintextParser } from 'src/server/description-parsing/plaintext/plaintext.parser';
import ImageManipulator from 'src/server/file-manipulation/manipulators/image.manipulator';
import Http from 'src/server/http/http.util';
import { CancellationToken } from 'src/server/submission/post/cancellation/cancellation-token';
import {
  FilePostData,
  PostFile,
} from 'src/server/submission/post/interfaces/file-post-data.interface';
import { PostData } from 'src/server/submission/post/interfaces/post-data.interface';
import { ValidationParts } from 'src/server/submission/validator/interfaces/validation-parts.interface';
import FileSize from 'src/server/utils/filesize.util';
import FormContent from 'src/server/utils/form-content.util';
import WebsiteValidator from 'src/server/utils/website-validator.util';
import { LoginResponse } from '../interfaces/login-response.interface';
import { ScalingOptions } from '../interfaces/scaling-options.interface';
import { Website } from '../website.base';
import * as _ from 'lodash';
import WaitUtil from 'src/server/utils/wait.util';

const INFO_KEY = 'INSTANCE INFO';

type PixelfedInstanceInfo = {
  configuration: {
    statuses: {
      max_characters: number;
      max_media_attachments: number;
    };
    media_attachments: {
      supported_mime_types: string[];
      image_size_limit: number;
      video_size_limit: number;
    };
  };
};

@Injectable()
export class Pixelfed extends Website {
  readonly BASE_URL = '';
  readonly enableAdvertisement = false;
  readonly acceptsAdditionalFiles = true;
  readonly defaultDescriptionParser = PlaintextParser.parse;
  readonly acceptsFiles = [
    'png',
    'jpeg',
    'jpg',
    'gif',
    'swf',
    'flv',
    'mp4',
  ];

  async checkLoginStatus(data: UserAccountEntity): Promise<LoginResponse> {
    const status: LoginResponse = { loggedIn: false, username: null };
    const accountData: PixelfedAccountData = data.data;
    if (accountData && accountData.token) {
      const refresh = await this.refreshToken(accountData);
      if (refresh) {
        status.loggedIn = true;
        status.username = accountData.username;
        this.getInstanceInfo(data._id, accountData);
      }
    }
    return status;
  }

  private async getInstanceInfo(profileId: string, data: PixelfedAccountData) {
    const M = new PixelfedInstance({
      access_token: data.token,
      api_url: `${data.website}/api/v1/`,
    });

    const instance = await M.get('instance');

    this.storeAccountInformation(profileId, INFO_KEY, instance.data);
  }

  // TBH not entirely sure why this is a thing, but its in the old code so... :shrug:
  private async refreshToken(data: PixelfedAccountData): Promise<boolean> {
    const M = this.getPixelfedInstance(data);
    return true;
  }

  private getPixelfedInstance(data: PixelfedAccountData) {
    return new PixelfedInstance({
      access_token: data.token,
      api_url: `${data.website}/api/v1/`,
    });
  }

  getScalingOptions(file: FileRecord, accountId: string): ScalingOptions {
    const instanceInfo: PixelfedInstanceInfo = this.getAccountInfo(accountId, INFO_KEY);
    return instanceInfo?.configuration?.media_attachments
      ? {
          maxSize:
            file.type === FileSubmissionType.IMAGE
              ? instanceInfo.configuration.media_attachments.image_size_limit
              : instanceInfo.configuration.media_attachments.video_size_limit,
        }
      : { maxSize: FileSize.MBtoBytes(300) };
  }

  private async uploadMedia(
    data: PixelfedAccountData,
    file: PostFile,
    altText: string,
  ): Promise<{ id: string }> {
    const upload = await Http.post<{ id: string; errors: any; url: string }>(
      `${data.website}/api/v2/media`,
      undefined,
      {
        type: 'multipart',
        data: {
          file,
          description: altText,
        },
        requestOptions: { json: true },
        headers: {
          Accept: '*/*',
          'User-Agent': 'node-mastodon-client/PostyBirb',
          Authorization: `Bearer ${data.token}`,
        },
      },
    );

    this.verifyResponse(upload, 'Verify upload');

    // Processing
    if (upload.response.statusCode === 202 || !upload.body.url) {
      for (let i = 0; i < 10; i++) {
        await WaitUtil.wait(4000);
        const checkUpload = await Http.get<{ id: string; errors: any; url: string }>(
          `${data.website}/api/v1/media/${upload.body.id}`,
          undefined,
          {
            requestOptions: { json: true },
            headers: {
              Accept: '*/*',
              'User-Agent': 'node-mastodon-client/PostyBirb',
              Authorization: `Bearer ${data.token}`,
            },
          },
        );

        if (checkUpload.body.url) {
          break;
        }
      }
    }

    if (upload.body.errors) {
      return Promise.reject(
        this.createPostResponse({ additionalInfo: upload.body, message: upload.body.errors }),
      );
    }

    return { id: upload.body.id };
  }

  async postFileSubmission(
    cancellationToken: CancellationToken,
    data: FilePostData<PixelfedFileOptions>,
    accountData: PixelfedAccountData,
  ): Promise<PostResponse> {
    const M = this.getPixelfedInstance(accountData);

    const files = [data.primary, ...data.additional];
    this.checkCancelled(cancellationToken);
    const uploadedMedias: {
      id: string;
    }[] = [];
    for (const file of files) {
      uploadedMedias.push(await this.uploadMedia(accountData, file.file, data.options.altText));
    }

    const instanceInfo: PixelfedInstanceInfo = this.getAccountInfo(data.part.accountId, INFO_KEY);
    const chunkCount = instanceInfo ? instanceInfo?.configuration?.statuses?.max_media_attachments : 4;
    const maxChars = instanceInfo ? instanceInfo?.configuration?.statuses?.max_characters : 500;

    const isSensitive = data.rating !== SubmissionRating.GENERAL;
    const { options } = data;
    const chunks = _.chunk(uploadedMedias, chunkCount);
    let lastId = undefined;
    for (let i = 0; i < chunks.length; i++) {
      let form = undefined;
      if (i === 0) {
        form = {
          status: `${options.useTitle && data.title ? `${data.title}\n` : ''}${
            data.description
          }`.substring(0, maxChars),
          sensitive: isSensitive,
          visibility: options.visibility || 'public',
          media_ids: chunks[i].map((media) => media.id),
        };
      } else {
        form = {
          sensitive: isSensitive,
          visibility: options.visibility || 'public',
          media_ids: chunks[i].map((media) => media.id),
          in_reply_to_id: lastId,
        };
      }

      this.logger.debug(`Number of tags set ${data.tags.length}`);

      // Update the post content with the Tags if any are specified - for Pixelfed, we need to append 
      // these onto the post, *IF* there is character count available.
      if (data.tags.length > 0) {
        form.status += "\n\n";
      }

      data.tags.forEach(tag => {
        let remain = maxChars - form.status.length;
        let tagToInsert = tag;
        if (!tag.startsWith('#')) {
          tagToInsert = `#${tagToInsert}`
        }
        if (remain > (tagToInsert.length)) {
          form.status += ` ${tagToInsert}`
        }
        // We don't exit the loop, so we can cram in every possible tag, even if there are short ones!
      })
      
      if (options.spoilerText) {
        form.spoiler_text = options.spoilerText;
      }

      const post = await M.post('statuses', form);
      lastId = post.data.id;

      if (!lastId || post.data.error) {
        return Promise.reject(
          this.createPostResponse({ message: post.data.error, additionalInfo: post.data }),
        );
      }
    }

    this.checkCancelled(cancellationToken);

    return this.createPostResponse({});
  }

  validateFileSubmission(
    submission: FileSubmission,
    submissionPart: SubmissionPart<PixelfedFileOptions>,
    defaultPart: SubmissionPart<DefaultOptions>,
  ): ValidationParts {
    const problems: string[] = [];
    const warnings: string[] = [];
    const isAutoscaling: boolean = submissionPart.data.autoScale;

    const description = this.defaultDescriptionParser(
      FormContent.getDescription(defaultPart.data.description, submissionPart.data.description),
    );

    const instanceInfo: PixelfedInstanceInfo = this.getAccountInfo(
      submissionPart.accountId,
      INFO_KEY,
    );
    const maxChars = instanceInfo ? instanceInfo?.configuration?.statuses?.max_characters : 500;

    if (description.length > maxChars) {
      warnings.push(
        `Max description length allowed is ${maxChars} characters (for this Pixelfed client).`,
      );
    }

    const files = [
      submission.primary,
      ...(submission.additional || []).filter(
        (f) => !f.ignoredAccounts!.includes(submissionPart.accountId),
      ),
    ];

    const maxImageSize = instanceInfo
      ? instanceInfo?.configuration?.media_attachments?.image_size_limit
      : FileSize.MBtoBytes(50);
    files.forEach((file) => {
      const { type, size, name, mimetype } = file;
      if (!WebsiteValidator.supportsFileType(file, this.acceptsFiles)) {
        problems.push(`Does not support file format: (${name}) ${mimetype}.`);
      }

      if (maxImageSize < size) {
        if (
          isAutoscaling &&
          type === FileSubmissionType.IMAGE &&
          ImageManipulator.isMimeType(mimetype)
        ) {
          warnings.push(`${name} will be scaled down to ${FileSize.BytesToMB(maxImageSize)}MB`);
        } else {
          problems.push(`Pixelfed limits ${mimetype} to ${FileSize.BytesToMB(maxImageSize)}MB`);
        }
      }
    });

    if ((submissionPart.data.tags.value.length > 1 || defaultPart.data.tags.value.length > 1) && 
      submissionPart.data.visibility != "public") {
        warnings.push(
              `This post won't be listed under any hashtag as it is not public. Only public posts 
              can be searched by hashtag.`,
            );
    }

    return { problems, warnings };
  }
}