import React from 'react';
import * as _ from 'lodash';
import {
  DefaultOptions,
  SubmissionPart
} from '../../../../electron-app/src/submission/interfaces/submission-part.interface';
import { SubmissionSectionProps } from '../../views/submissions/interfaces/submission-section.interface';
import { Submission } from '../../../../electron-app/src/submission/interfaces/submission.interface';
import TagInput from '../../views/submissions/form-components/TagInput';
import DescriptionInput from '../../views/submissions/form-components/DescriptionInput';
import { Alert, Form, Input } from 'antd';

const defaultOptions: DefaultOptions = {
  tags: {
    extendDefault: true,
    value: []
  },
  description: {
    overwriteDefault: false,
    value: ''
  },
  rating: null,
  useThumbnail: true
};

export default class GenericSubmissionSection extends React.Component<
  SubmissionSectionProps<Submission, DefaultOptions>
> {
  private readonly defaultOptions: DefaultOptions = _.cloneDeep(defaultOptions);

  handleChange(fieldName: string, { target }) {
    const part: SubmissionPart<DefaultOptions> = _.cloneDeep(this.props.part);
    part.data[fieldName] = target.value;
    this.props.onUpdate(part);
  }

  handleTagChange(update: any) {
    const part: SubmissionPart<DefaultOptions> = _.cloneDeep(this.props.part);
    part.data.tags = update;
    this.props.onUpdate(part);
  }

  handleDescriptionChange(update) {
    const part: SubmissionPart<DefaultOptions> = _.cloneDeep(this.props.part);
    part.data.description = update;
    this.props.onUpdate(part);
  }

  handleCheckboxChange(fieldName: string, { target }) {
    const part: SubmissionPart<DefaultOptions> = _.cloneDeep(this.props.part);
    part.data[fieldName] = target.checked;
    this.props.onUpdate(part);
  }

  render() {
    const { data } = this.props.part;
    return (
      <div>
        {this.props.problems.length ? (
          <Alert
            type="error"
            message={
              <ul>
                {this.props.problems.map(problem => (
                  <li>{problem}</li>
                ))}
              </ul>
            }
          />
        ) : null}
        <div>
          <Form.Item label="Title">
            <Input
              placeholder="Using default"
              value={data.title}
              onChange={this.handleChange.bind(this, 'title')}
            />
          </Form.Item>
          <TagInput
            onChange={this.handleTagChange.bind(this)}
            defaultValue={data.tags}
            defaultTags={this.props.defaultData!.tags}
            label="Tags"
          />
          <DescriptionInput
            defaultValue={data.description}
            onChange={this.handleDescriptionChange.bind(this)}
            label="Description"
          />
        </div>
      </div>
    );
  }
}