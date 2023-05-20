import { DefaultOptions, SubmissionPart } from 'postybirb-commons';

export interface FormSubmissionPart<T extends DefaultOptions> extends SubmissionPart<T> {
  isNew?: boolean;
}
