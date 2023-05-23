import { Inject, Injectable, Logger } from '@nestjs/common';
import { app } from 'electron';
import { FileSubmission, Submission, SubmissionType } from 'postybirb-commons';
import SubmissionEntity from '../models/submission.entity';
import { SubmissionPartService } from '../submission-part/submission-part.service';
import { PartWithResponse } from 'postybirb-commons';
import { SubmissionLogRepository, SubmissionLogRepositoryToken } from './log.repository';
import SubmissionLogEntity from './models/submission-log.entity';
import FileSubmissionEntity from '../file-submission/models/file-submission.entity';

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);
  private readonly MAX_LOGS: number = 30;

  constructor(
    @Inject(SubmissionLogRepositoryToken)
    private readonly repository: SubmissionLogRepository,
    private readonly partService: SubmissionPartService,
  ) {}

  async getLogs(type?: SubmissionType): Promise<SubmissionLogEntity[]> {
    let logs = await this.repository.find();
    if (type) {
      logs = logs.filter((log) => log.submission.type === type);
    }
    return logs.sort((a, b) => a.created - b.created).reverse();
  }

  async addLog(submission: SubmissionEntity, parts: PartWithResponse[]): Promise<void> {
    if (parts.length) {
      this.logger.log(submission._id, 'Creating Log');
      const copy: Submission = submission.asPlain();
      if (submission instanceof FileSubmissionEntity) {
        this.cleanBuffers(copy as FileSubmission);
      }
      await this.repository.save(
        new SubmissionLogEntity({
          submission: copy,
          parts,
          version: app.getVersion(),
          defaultPart: (
            await this.partService.getPartsForSubmission(submission._id, false)
          ).filter((p) => p.isDefault)[0],
        }),
      );

      await this.checkForTruncate();
    }
  }

  async checkForTruncate() {
    const logs = await this.getLogs();
    if (logs.length > this.MAX_LOGS) {
      const sorted = logs.sort((a, b) => a.created - b.created).reverse();
      sorted.splice(0, this.MAX_LOGS);
      await Promise.all(sorted.map((log) => this.repository.remove(log._id)));
    }
  }

  private cleanBuffers(submission: FileSubmission) {
    [submission.primary, submission.fallback, submission.thumbnail, ...submission.additional]
      .filter((s) => s)
      .forEach((file) => (file.buffer = undefined));
  }
}
