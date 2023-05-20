import { Button, Form, Input, message, Spin } from 'antd';
import Axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom';
import { PixelfedAccountData } from 'postybirb-commons';
import LoginService from '../../services/login.service';
import { LoginDialogProps } from '../interfaces/website.interface';
import { stringify } from 'querystring';

interface State extends PixelfedAccountData {
  code: string;
  loading: boolean;
}

export default class PixelfedLogin extends React.Component<LoginDialogProps, State> {
  state: State = {
    username: '',
    token: '',
    website: 'Pixelfed.social',
    code: '',
    loading: true
  };

  private view: any;

  constructor(props: LoginDialogProps) {
    super(props);
    this.state = {
      ...this.state,
      ...(props.data as State)
    };
  }

  componentDidMount() {
    const node = ReactDOM.findDOMNode(this);
    if (node instanceof HTMLElement) {
      const view: any = node.querySelector('.webview');
      this.view = view;
      view.addEventListener('did-stop-loading', () => {
        if (this.state.loading) this.setState({ loading: false });
      });
      // view.addEventListener('did-start-navigation', (url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
      // });

      view.addEventListener(
        'did-redirect-navigation',
        (url, isInPlace, isMainframe, frameProcessId, frameRoutingId) => {
          if (url.url.includes('urn:ietf:wg:oauth:2.0:oob')) {
            // We have a token !
            this.setState({ code: url.url.replace('urn:ietf:wg:oauth:2.0:oob?code=', '') });
          }
        }
      );

      view.addEventListener(
        'will-redirect',
        (event, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
          console.log(url);
        }
      );

      view.allowpopups = false;
      view.partition = `persist:${this.props.account._id}`;
      view.src = this.getAuthURL();
    }
  }

  private getAuthURL(website?: string): string {
    return `${window.AUTH_SERVER_URL}/Mastodon/v2/authorize?website=${encodeURIComponent(
      this.getWebsiteURL(website)
    )}`;
  }

  private getWebsiteURL(website?: string) {
    return `https://${website || this.state.website}`;
  }

  submit() {
    const website = this.getWebsiteURL();
    Axios.post<{ success: boolean; error: string; data: { token: string; username: string } }>(
      `${window.AUTH_SERVER_URL}/Mastodon/v2/authorize/`,
      {
        website,
        code: this.state.code
      },
      { responseType: 'json' }
    )
      .then(({ data }) => {
        if (data.success) {
          LoginService.setAccountData(this.props.account._id, { ...data.data, website }).then(
            () => {
              message.success(`${website} authenticated.`);
            }
          );
        } else {
          message.error(data.error);
        }
      })
      .catch(() => {
        message.error(`Failed to authenticate ${website}.`);
      });
  }

  isValid(): boolean {
    return !!this.state.website && !!this.state.code;
  }

  render() {
    return (
      <div className="h-full">
        <div className="container">
          <Form layout="vertical">
            <Form.Item label="Website" required>
              <Input
                className="w-full"
                defaultValue={this.state.website}
                addonBefore="https://"
                onBlur={({ target }) => {
                  const website = target.value.replace(/(https:\/\/|http:\/\/)/, '');
                  this.view.loadURL(this.getAuthURL(website));
                  this.setState({ website });
                }}
              />
            </Form.Item>
            <Form.Item label="Code" help="Obtained from authenticating the website" required>
              <Input
                value={this.state.code}
                onChange={({ target }) => this.setState({ code: target.value })}
                addonAfter={
                  <Button onClick={this.submit.bind(this)} disabled={!this.isValid()}>
                    Authorize
                  </Button>
                }
              />
            </Form.Item>
          </Form>
        </div>
        <Spin wrapperClassName="full-size-spinner" spinning={this.state.loading}>
          <webview className="webview h-full w-full" />
        </Spin>
      </div>
    );
  }
}
