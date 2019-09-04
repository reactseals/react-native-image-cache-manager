import PropTypes from 'prop-types';
import React from 'react';
import RNFS, { DocumentDirectoryPath, CachesDirectoryPath, MainBundlePath } from 'react-native-fs';

const SHA1 = require("crypto-js/sha1");
const URL = require('url-parse');

function deleteCache(filePath) {
    RNFS
    .exists(filePath)
    .then((res) => {
        if (res) {
            RNFS
            .unlink(filePath)
            .catch((err) => {});
        }
    });
}

function processSource(source) {
    if (source !== null && source != '') {
        const url = new URL(source, null, true);

        let cacheable = source;

        const type = url.pathname.replace(/.*\.(.*)/, '$1');
        let ext;

        if (type === '/') {
            if (source.match('.png')) {
                ext = '.png';
            } else if (source.match('.jpg')) {
                ext = '.jpg';
            } else if (source.match('.jpeg')) {
                ext = '.jpeg';
            }
        }

        let cacheKey;
        if (ext) {
            cacheKey = `${SHA1(cacheable)}${ext}`;
        } else {
            cacheKey = SHA1(cacheable) + (type.length < url.pathname.length ? '.' + type : '');
        }
        cacheable = cacheable.concat(url.query);

        return checkImageCache(source, url.host, cacheKey);
    }

    return Promise.reject('No source');
}

function checkImageCache(imageUri, cachePath, cacheKey) {
    const dirPath = `${CachesDirectoryPath}/${cachePath}`;
    const filePath = `${dirPath}/${cacheKey}`;

    return RNFS
        .stat(filePath)
        .then((res) => {
            if (res.isFile() && res.size > 0) {
              return filePath;
            } else {
                throw Error("Invalid file");
            }
        })
        .catch((err) => {
            return RNFS
                .mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true })
                .then(() => {
                    let downloadOptions = {
                        fromUrl: imageUri,
                        toFile: filePath,
                        background: true
                    };

                    let download = RNFS.downloadFile(downloadOptions);
                    return download.promise
                        .then((res) => {
                            switch (res.statusCode) {
                                case 404:
                                case 403:
                                    return Promise.reject();
                                    break;
                                default:
                                    return filePath;
                            }
                        })
                        .catch((err) => {
                            deleteCache(filePath);
                            return Promise.reject(`Err downloading image ${err}`);
                        });
                })
                .catch((err) => {
                    deleteCache(filePath);
                    return Promise.reject(`Err mkdir ${err}`);
                });
        });
}

export default { deleteCache, processSource };
