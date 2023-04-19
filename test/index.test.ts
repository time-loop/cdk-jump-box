import { App, aws_kms, aws_ec2, aws_iam, CfnElement, Resource, Stack } from 'aws-cdk-lib';
import { KeyPair } from 'cdk-ec2-key-pair';
import { Namer } from 'multi-convention-namer';

import { JumpBox } from '../src';
import { Match, Template } from 'aws-cdk-lib/assertions';

export function getLogicalId(resource: Resource): string {
  return resource.stack.getLogicalId(resource.node.defaultChild as CfnElement);
}

const name = new Namer(['test']);

describe('JumpBox', () => {
  describe('default', () => {
    const app = new App();
    const stack = new Stack(app, name.pascal);
    new JumpBox(stack, name, {
      kmsKey: new aws_kms.Key(stack, 'Key'),
      vpc: new aws_ec2.Vpc(stack, 'Vpc'),
    });
    const template = Template.fromStack(stack);

    it('creates resources', () => {
      [
        'Custom::EC2-Key-Pair',
        'AWS::EC2::SecurityGroup',
        'AWS::IAM::InstanceProfile',
        'AWS::AutoScaling::LaunchConfiguration',
        'AWS::AutoScaling::AutoScalingGroup',
      ].forEach((r) => template.resourceCountIs(r, 1));
    });
    it('created role makes sense', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: {
                  'Fn::Join': [
                    '',
                    [
                      'ec2.',
                      {
                        Ref: 'AWS::URLSuffix',
                      },
                    ],
                  ],
                },
              },
            },
          ],
        }),
        ManagedPolicyArns: Match.arrayWith([
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':iam::aws:policy/AmazonSSMManagedInstanceCore',
              ],
            ],
          },
        ]),
      });
    });
    it('sshAccess disabled by default', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: Match.absent(),
      });
    });
    it('instanceType is t4g.nano', () => {
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        InstanceType: 't4g.nano',
      });
    });
    it.only('machineImage is AmazonLinux2022', () => {
      // CDK finds the latest Amazon Linux 2022 AMI
      // by referencing a well known SSM parameter.
      const params = template.findParameters('*', {
        Type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
        Default: Match.stringLikeRegexp('/aws/service/ami-amazon-linux-latest/.*'),
      });
      expect(Object.keys(params).length).toEqual(1);
      const paramRef = Object.keys(params)[0];
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        ImageId: { Ref: paramRef},
      });
      // NOTE: this may evolve over time, but was still true as of aws-cdk-lib v2.75.1
      expect(params[paramRef].Default).toMatch('/aws/service/ami-amazon-linux-latest/al2022-ami-kernel-5.10-arm64');
    });

    // it('outputs ProxyEndpoint', () => {
    //   template.hasOutput('ProxyEndpoint', {});
    // });
  });
  describe('options', () => {
    it('instanceType', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.R6G, aws_ec2.InstanceSize.XLARGE24),
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        InstanceType: 'r6g.24xlarge',
      });
    });
    it('keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);

      new JumpBox(stack, new Namer(['test']), {
        keyPair: new KeyPair(stack, 'KeyPair', { kms: new aws_kms.Key(stack, 'Key'), name: 'premadeKeyPair' }),
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('Custom::EC2-Key-Pair', { Name: 'premadeKeyPair' });
    });
    it('errors when both kmsKey and keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const kmsKey = new aws_kms.Key(stack, 'Key');

      expect(() => {
        new JumpBox(stack, new Namer(['test']), {
          keyPair: new KeyPair(stack, 'KeyPair', { kms: kmsKey, name: 'premadeKeyPair' }),
          kmsKey,
          vpc: new aws_ec2.Vpc(stack, 'Vpc'),
        });
      }).toThrow('You must not provide both a kmsKey and a keyPair');
    });
    it('errors when neither kmsKey nor keyPair', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      expect(() => {
        new JumpBox(stack, new Namer(['test']), {
          vpc: new aws_ec2.Vpc(stack, 'Vpc'),
        });
      }).toThrowError('You must provide either a keypair or a kmsKey');
    });
    it('role', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const role = new aws_iam.Role(stack, 'Role', {
        assumedBy: new aws_iam.ServicePrincipal('fake'),
      });
      // const foo = stack.node.findChild('Role');
      // stack.getLogicalId();
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        role,
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: Match.arrayWith([
          {
            Ref: getLogicalId(role),
          },
        ]),
      });
    });
    it('securityGroup', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      const vpc = new aws_ec2.Vpc(stack, 'Vpc');
      const securityGroup = new aws_ec2.SecurityGroup(stack, 'Sg', { vpc });
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        securityGroup,
        vpc,
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
        SecurityGroups: [
          {
            'Fn::GetAtt': ['SgD4954771', 'GroupId'],
          },
        ],
      });
    });
    it('sshAccess', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        sshAccess: true,
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'SG for Test',
        SecurityGroupIngress: [
          {
            CidrIp: '0.0.0.0/0',
            Description: 'from 0.0.0.0/0:22',
            FromPort: 22,
            IpProtocol: 'tcp',
            ToPort: 22,
          },
        ],
      });
    });
    it('vpcSubnets', () => {
      const app = new App();
      const stack = new Stack(app, name.pascal);
      new JumpBox(stack, new Namer(['test']), {
        kmsKey: new aws_kms.Key(stack, 'Key'),
        vpcSubnets: { subnetType: aws_ec2.SubnetType.PUBLIC },
        vpc: new aws_ec2.Vpc(stack, 'Vpc'),
      });
      const template = Template.fromStack(stack);
      ['VpcPublicSubnet1Subnet5C2D37C4', 'VpcPublicSubnet2Subnet691E08A3'].forEach((subnet) => {
        template.hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
          VPCZoneIdentifier: Match.arrayWith([
            {
              Ref: subnet,
            },
          ]),
        });
      });
    });
  });
});
