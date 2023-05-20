import { Checkbox, Form, Select } from 'antd';
import {
  FileSubmission,
  Folder,
  Submission,
  SubscribeStarFileOptions,
  SubscribeStarNotificationOptions
} from 'postybirb-commons';
import React from 'react';
import WebsiteService from '../../services/website.service';
import { WebsiteSectionProps } from '../form-sections/website-form-section.interface';
import GenericFileSubmissionSection from '../generic/GenericFileSubmissionSection';
import { GenericSelectProps } from '../generic/GenericSelectProps';
import GenericSubmissionSection from '../generic/GenericSubmissionSection';
import { WebsiteImpl } from '../website.base';

export class SubscribeStar extends WebsiteImpl {
  internalName: string = 'SubscribeStar';
  name: string = 'SubscribeStar';
  supportsAdditionalFiles: boolean = true;
  supportsTags: boolean = false;
  loginUrl: string = 'https://www.subscribestar.com';

  FileSubmissionForm = (props: WebsiteSectionProps<FileSubmission, SubscribeStarFileOptions>) => (
    <SubscribeStarFileSubmissionForm
      key={props.part.accountId}
      hideThumbnailOptions={true}
      hideTitle={true}
      ratingOptions={{
        show: false
      }}
      {...props}
    />
  );

  NotificationSubmissionForm = (
    props: WebsiteSectionProps<Submission, SubscribeStarNotificationOptions>
  ) => (
    <SubscribeStarNotificationSubmissionForm
      key={props.part.accountId}
      hideTitle={true}
      ratingOptions={{
        show: false
      }}
      {...props}
    />
  );
}

interface SubscribeStarSubmissionState {
  tiers: Folder[];
}

export class SubscribeStarNotificationSubmissionForm extends GenericSubmissionSection<SubscribeStarNotificationOptions> {
  state: SubscribeStarSubmissionState = {
    tiers: []
  };

  constructor(props: WebsiteSectionProps<FileSubmission, SubscribeStarNotificationOptions>) {
    super(props);
    this.state = {
      tiers: []
    };

    WebsiteService.getAccountFolders(this.props.part.website, this.props.part.accountId).then(
      ({ data }) => {
        if (data) {
          this.setState({ tiers: data });
          if (!this.props.part.data.tiers.length) {
            this.setValue(
              'tiers',
              data.filter(tier => tier.value !== 'free').map(tier => tier.value)
            );
          }
        }
      }
    );
  }

  renderLeftForm(data: SubscribeStarNotificationOptions) {
    const elements = super.renderLeftForm(data);
    elements.push(
      <div>
        <Checkbox
          checked={data.useTitle}
          onChange={this.handleCheckedChange.bind(this, 'useTitle')}
        >
          Use Title
        </Checkbox>
      </div>,
      <Form.Item label="Access Tiers">
        <Select
          {...GenericSelectProps}
          className="w-full"
          value={data.tiers}
          onChange={this.setValue.bind(this, 'tiers')}
          mode="multiple"
          allowClear={true}
        >
          {this.state.tiers.map(tier => (
            <Select.Option value={tier.value}>{tier.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>
    );
    return elements;
  }
}

export class SubscribeStarFileSubmissionForm extends GenericFileSubmissionSection<SubscribeStarFileOptions> {
  state: SubscribeStarSubmissionState = {
    tiers: []
  };

  constructor(props: WebsiteSectionProps<FileSubmission, SubscribeStarFileOptions>) {
    super(props);
    this.state = {
      tiers: []
    };

    WebsiteService.getAccountFolders(this.props.part.website, this.props.part.accountId).then(
      ({ data }) => {
        if (data) {
          this.setState({ tiers: data });
          if (!this.props.part.data.tiers.length) {
            this.setValue(
              'tiers',
              data.filter(tier => tier.value !== 'free').map(tier => tier.value)
            );
          }
        }
      }
    );
  }

  renderLeftForm(data: SubscribeStarFileOptions) {
    const elements = super.renderLeftForm(data);
    elements.push(
      <div>
        <Checkbox
          checked={data.useTitle}
          onChange={this.handleCheckedChange.bind(this, 'useTitle')}
        >
          Use Title
        </Checkbox>
      </div>,
      <Form.Item label="Access Tiers">
        <Select
          {...GenericSelectProps}
          className="w-full"
          value={data.tiers}
          onChange={this.setValue.bind(this, 'tiers')}
          mode="multiple"
          allowClear={true}
        >
          {this.state.tiers.map(tier => (
            <Select.Option value={tier.value}>{tier.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>
    );
    return elements;
  }
}
