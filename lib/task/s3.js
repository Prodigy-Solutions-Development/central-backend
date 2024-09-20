// Copyright 2024 ODK Central Developers
// See the NOTICE file at the top-level directory of this distribution and at
// https://github.com/getodk/central-backend/blob/master/NOTICE.
// This file is part of ODK Central. It is subject to the license terms in
// the LICENSE file found in the top-level directory of this distribution and at
// https://www.apache.org/licenses/LICENSE-2.0. No part of ODK Central,
// including this file, may be copied, modified, propagated, or distributed
// except according to the terms contained in the LICENSE file.

const { task: { withContainer } } = require('./task');

/* eslint-disable no-console */

const assertEnabled = s3 => {
  if (!s3.enabled) {
    throw new Error('S3 blob support is not enabled.');
  }
};

const getCount = withContainer(({ s3, Blobs }) => async status => {
  assertEnabled(s3);
  const count = await Blobs.s3CountByStatus(status);
  console.log(count);
  return count; // just for testing
});

const setFailedToPending = withContainer(({ s3, Blobs }) => async () => {
  assertEnabled(s3);
  const count = await Blobs.s3SetFailedToPending();
  console.log(`${count} blobs marked for re-uploading.`);
});

const uploadPending = withContainer(({ s3, Blobs }) => async (limit) => {
  assertEnabled(s3);

  const pendingCount = await Blobs.s3CountByStatus('pending');
  const count = limit ? Math.min(pendingCount, limit) : pendingCount;

  const signals = ['SIGINT', 'SIGTERM'];

  const shutdownListener = async signal => {
    await s3.destroy();
    process.kill(process.pid, signal);
  };
  signals.forEach(s => process.once(s, shutdownListener));

  try {
    console.log(`Uploading ${count} blobs...`);
    await Blobs.s3UploadPending(limit);
    console.log(`[${new Date().toISOString()}]`, 'Upload completed.');
  } finally {
    signals.forEach(s => process.removeListener(s, shutdownListener));
  }
});

module.exports = { getCount, setFailedToPending, uploadPending };