import PropTypes from 'prop-types';
import React from 'react';
import RNFS, { DocumentDirectoryPath } from 'react-native-fs';

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

        let cacheable = url.pathname;
        cacheable = cacheable.concat(url.query);

        const type = url.pathname.replace(/.*\.(.*)/, '$1');
        const cacheKey = SHA1(cacheable) + (type.length < url.pathname.length ? '.' + type : '');

        return checkImageCache(source, url.host, cacheKey);
    }

    return Promise.reject();
}

function checkImageCache(imageUri, cachePath, cacheKey) {
    const dirPath = DocumentDirectoryPath+'/'+cachePath;
    const filePath = dirPath+'/'+cacheKey;

    return RNFS
        .stat(filePath)
        .then((res) => {
            if (res.isFile() && res.size > 0) {
              return filePath;
            } else {
                throw Error("CacheableImage: Invalid file in checkImageCache()");
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
                    download.promise
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
                        deleteFilePath(filePath);
                        return Promise.reject();
                    });
                })
                .catch((err) => {
                    deleteFilePath(filePath);
                    return Promise.reject();
                });
        });
}

export default { deleteCache, processSource };
