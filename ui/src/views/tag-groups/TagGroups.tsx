import React from 'react';
import * as _ from 'lodash';
import './TagGroup.css';
import { inject, observer } from 'mobx-react';
import { TagGroupStore } from '../../stores/tag-group.store';
import { TagGroup } from '../../../../electron-app/src/tag-group/tag-group.interface';
import TagGroupService from '../../services/tag-group.service';
import TagInput from '../submissions/form-components/TagInput';
import { TagData } from '../../../../electron-app/src/submission/interfaces/submission-part.interface';
import { Input, Button, message, Popconfirm, Spin, Empty, Card, Icon } from 'antd';

interface Props {
  tagGroupStore?: TagGroupStore;
}

@inject('tagGroupStore')
@observer
export default class TagGroups extends React.Component<Props> {
  createNewGroup() {
    TagGroupService.create({
      id: Date.now().toString(),
      alias: 'New Tag Group',
      tags: []
    });
  }

  render() {
    const groups = this.props.tagGroupStore!.groups;
    return (
      <div>
        {groups.length ? (
          <div>
            <Button className="mb-2" type="primary" onClick={this.createNewGroup}>
              Add New Group
            </Button>
            {groups.map(g => (
              <div className="tag-group-display">
                <TagGroupInput key={g.id} {...g} />
              </div>
            ))}
          </div>
        ) : (
          <Empty description={<span>No tag groups</span>}>
            <Button type="primary" onClick={this.createNewGroup}>
              Create Tag Group
            </Button>
          </Empty>
        )}
      </div>
    );
  }
}

interface TagGroupInputState {
  touched: boolean;
  saving: boolean;
  tagGroup: TagGroup;
}

class TagGroupInput extends React.Component<TagGroup, TagGroupInputState> {
  state: TagGroupInputState = {
    touched: false,
    saving: false,
    tagGroup: {
      id: '',
      alias: '',
      tags: []
    }
  };

  private original!: TagGroup;

  constructor(props: TagGroup) {
    super(props);
    this.original = _.cloneDeep(props);
    this.state.tagGroup = _.cloneDeep(props);
  }

  handleTagChange = (update: TagData) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.tags = update.value;
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  handleNameChange = ({ target }) => {
    const copy = _.cloneDeep(this.state.tagGroup);
    copy.alias = target.value.trim();
    this.setState({ touched: !_.isEqual(copy, this.original), tagGroup: copy });
  };

  onSave = () => {
    if (!this.state.touched) {
      message.info('No changes to save.');
      return;
    }

    this.setState({ saving: true });
    TagGroupService.update(this.state.tagGroup)
      .then(() => {
        this.setState({ saving: false, touched: false });
        message.success('Tag group updated.');
      })
      .catch(err => {
        this.setState({ saving: false });
        message.error('Name cannot be empty.');
      });
  };

  onDelete = () => {
    TagGroupService.deleteTagGroup(this.props.id)
      .then(() => message.success('Tag group removed.'))
      .catch(() => message.error('Failed to remove tag group.'));
  };

  render() {
    return (
      <div>
        <Spin spinning={this.state.saving} delay={500}>
          <Card
            size="small"
            title={
              <Input
                defaultValue={this.state.tagGroup.alias}
                required={true}
                onBlur={this.handleNameChange}
                placeholder="Name"
              />
            }
            actions={[
              <Icon type="save" key="save" onClick={this.onSave} />,
              <Popconfirm title="Are you sure?" onConfirm={this.onDelete}>
                <Icon type="delete" key="delete" />
              </Popconfirm>
            ]}
          >
            <TagInput
              onChange={this.handleTagChange}
              hideExtend={true}
              hideExtra={true}
              hideTagGroup={true}
              defaultValue={{ extendDefault: false, value: this.state.tagGroup.tags }}
            />
          </Card>
        </Spin>
      </div>
    );
  }
}