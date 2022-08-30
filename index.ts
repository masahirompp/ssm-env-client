/* eslint-disable @typescript-eslint/naming-convention */
import path from 'node:path';
import type {
  Parameter,
  PutParameterCommandInput,
  SSMClientConfig,
  Tag} from '@aws-sdk/client-ssm';
import {
  AddTagsToResourceCommand,
  DeleteParametersCommand,
  GetParametersByPathCommand,
  ParameterType,
  PutParameterCommand,
  ResourceTypeForTagging,
  SSMClient,
} from '@aws-sdk/client-ssm';

export type SsmEnvClientOption = {
  tagKeyPrefix?: string;
  ssmClientConfig?: SSMClientConfig;
  ssmBasePath?: string;
};

export class SsmEnvClient {
  private readonly basePath: string;
  private readonly ssmClient;
  private readonly envListPath;
  private readonly tagKeyPrefix;
  constructor(
    private readonly serviceName: string,
    private readonly option?: SsmEnvClientOption,
  ) {
    this.basePath = option?.ssmBasePath ?? '/';
    if (!this.basePath.startsWith('/')) {
      throw new Error('option.ssmBasePath must start with \'/\'');
    }

    this.ssmClient = new SSMClient(option?.ssmClientConfig ?? {});
    this.envListPath = path.join(this.basePath, `${this.serviceName}_ENV_LIST`);
    this.tagKeyPrefix = this.option?.tagKeyPrefix ?? '';
  }

  async loadEnvList() {
    const envParameters = await this.getParametersByPath(this.envListPath);
    return envParameters
      .map(p => p.Name)
      .filter((name): name is string => name !== undefined)
      .map(envNamePath => envNamePath.slice(`${this.envListPath}/`.length));
  }

  async putEnv(envName: string) {
    return this.putParameter(
      path.join(this.envListPath, envName),
      new Date().toISOString(),
      {Overwrite: false, Tags: this.makeTags(envName)},
    );
  }

  async loadParameters(envName: string) {
    const path = this.makeParameterPath(envName);
    const parameters = await this.getParametersByPath(path);
    // eslint-disable-next-line unicorn/no-array-reduce
    return parameters.reduce<Record<string, string | undefined>>(
      (payload, parameter) => ({
        ...payload,
        ...(parameter.Name
          ? {[parameter.Name.slice(`${path}/`.length)]: parameter.Value}
          : {}),
      }),
      {},
    );
  }

  async putParameters(envName: string, newParameters: Partial<Record<string, string>>) {
    const currentParameters = await this.loadParameters(envName);
    const putKeys: string[] = [];
    const removeKeys: string[] = [];
    for (const key of Object.keys(newParameters)) {
      if (!Object.hasOwn(currentParameters, key) && newParameters[key]?.length) {
        putKeys.push(key); // New key
      }
    }

    for (const key of Object.keys(currentParameters)) {
      if (Object.hasOwn(newParameters, key)) {
        if (currentParameters[key] !== newParameters[key]) {
          if (newParameters[key]?.length) {
            putKeys.push(key); // Modified key
          } else {
            removeKeys.push(key); // Remove key
          }
        }
      } else {
        removeKeys.push(key); // Remove key
      }
    }

    const Tags = this.makeTags(envName);
    await Promise.all([
      ...putKeys.map(async key =>
        this.putParameter(
          this.makeParameterPath(envName, key),
          newParameters[key]!,
          {Overwrite: true, Tags},
        ),
      ),
      removeKeys.length > 0
        && this.removeParameters(
          removeKeys.map(key => this.makeParameterPath(envName, key)),
        ),
    ]);
  }

  private makeTags(envName: string): Tag[] {
    return [
      {Key: `${this.tagKeyPrefix}SERVICE`, Value: this.serviceName},
      {Key: `${this.tagKeyPrefix}ENV`, Value: envName},
    ];
  }

  private makeParameterPath(envName: string, parameterName?: string) {
    return path.join(
      this.basePath,
      this.serviceName,
      envName,
      parameterName ?? '',
    );
  }

  private async putParameter(
    path: string,
    value: string,
    option: Omit<PutParameterCommandInput, 'Type' | 'Name' | 'Value'> = {},
  ) {
    const overwriteTags
      = option.Overwrite === true && option.Tags?.length ? option.Tags : [];
    if (overwriteTags.length > 0) {
      delete option.Tags;
    }

    return this.ssmClient
      .send(
        new PutParameterCommand({
          Type: ParameterType.STRING,
          Name: path,
          Value: value,
          ...option,
        }),
      )
      .then(async r => {
        if (overwriteTags.length > 0) {
          await this.ssmClient.send(
            new AddTagsToResourceCommand({
              ResourceId: path, // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ssm/interfaces/addtagstoresourcecommandinput.html
              ResourceType: ResourceTypeForTagging.PARAMETER,
              Tags: overwriteTags,
            }),
          );
        }

        return r;
      });
  }

  private async removeParameters(pathList: string[]) {
    return this.ssmClient.send(
      new DeleteParametersCommand({Names: pathList}),
    );
  }

  private async getParametersByPath(path: string) {
    const loadParameters: (
      path: string,
      nextToken?: string
    ) => Promise<Parameter[]> = async (path, nextToken) => {
      const {Parameters, NextToken} = await this.ssmClient.send(
        new GetParametersByPathCommand({
          Path: path,
          NextToken: nextToken,
        }),
      );
      if (!Parameters) {
        return [];
      }

      if (NextToken) {
        return [...Parameters, ...(await loadParameters(path, nextToken))];
      }

      return Parameters;
    };

    return loadParameters(path);
  }
}
