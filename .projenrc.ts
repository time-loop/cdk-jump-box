import { clickupCdk } from '@time-loop/clickup-projen';

const peerDeps = [
  'cdk-ec2-key-pair@3.3.1',
  'cdk-iam-floyd@^0.300.0',
  'constructs@^10.0.5',
  'multi-convention-namer@^0.1.12',
];

const project = new clickupCdk.ClickUpCdkConstructLibrary({
  name: '@time-loop/cdk-jump-box',
  cdkVersion: '2.17.0',
  defaultReleaseBranch: 'main',
  licensed: true,
  deps: [...peerDeps],
  devDeps: [...peerDeps, '@time-loop/clickup-projen'],
  peerDeps,
  repositoryUrl: 'https://github.com/time-loop/cdk-jump-box.git', // TODO: leverage default
  author: '', // leverage default
  authorAddress: '', // leverage default

  projenrcTs: true,
});

// We don't have any bundledDeps?!? :)
// project.npmrc.addConfig('node-linker', 'hoisted'); // PNPM support for bundledDeps https://pnpm.io/npmrc#node-linker

project.synth();
