import execa from 'execa'
import { parse } from 'xo-remote-parser'

import RemoteHandlerLocal from './local'
import RemoteHandlerNfs from './nfs'
import RemoteHandlerS3 from './s3'
import RemoteHandlerSmb from './smb'
import RemoteHandlerAzure from './azure'
export { DEFAULT_ENCRYPTION_ALGORITHM, UNENCRYPTED_ALGORITHM, isLegacyEncryptionAlgorithm } from './_encryptor'

const HANDLERS = {
  file: RemoteHandlerLocal,
  nfs: RemoteHandlerNfs,
  s3: RemoteHandlerS3,
  azure: RemoteHandlerAzure,
  azurite: RemoteHandlerAzure,
}

try {
  execa.sync('mount.cifs', ['-V'])
  HANDLERS.smb = RemoteHandlerSmb
} catch (_) {}

export const getHandler = (remote, ...rest) => {
  const Handler = HANDLERS[parse(remote.url).type]
  if (!Handler) {
    throw new Error('Unhandled remote type')
  }
  return new Handler(remote, ...rest)
}

export const getSyncedHandler = async (...opts) => {
  const handler = getHandler(...opts)
  await handler.sync()
  return {
    dispose: () => handler.forget(),
    value: handler,
  }
}
