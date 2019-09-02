import PropTypes from 'prop-types';
import React from 'react';
import RNFS, { DocumentDirectoryPath } from 'react-native-fs';

const SHA1 = require("crypto-js/sha1");
const URL = require('url-parse');


module.exports = (source = '', options = {}) => {
    return {
        deleteCache(filePath) => {
            RNFS
            .exists(filePath)
            .then((res) => {
                if (res) {
                    RNFS
                    .unlink(filePath)
                    .catch((err) => {});
                }
            });
        },

        processSource(source) {
            if (source !== null && source != '') {
                const url = new URL(source, null, true);

                // handle query params for cache key
                let cacheable = url.pathname;
                cacheable = cacheable.concat(url.query);

                const type = url.pathname.replace(/.*\.(.*)/, '$1');
                const cacheKey = SHA1(cacheable) + (type.length < url.pathname.length ? '.' + type : '');

                this.checkImageCache(source, url.host, cacheKey);
            }
        },

        checkImageCache(imageUri, cachePath, cacheKey) {
            const dirPath = DocumentDirectoryPath+'/'+cachePath;
            const filePath = dirPath+'/'+cacheKey;

            RNFS
            .stat(filePath)
            .then((res) => {
                if (res.isFile() && res.size > 0) {
                  return filePath;
                } else {
                    throw Error("CacheableImage: Invalid file in checkImageCache()");
                }
            })
            .catch((err) => {
                RNFS
                .mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true })
                .then(() => {
                    let downloadOptions = {
                        fromUrl: imageUri,
                        toFile: filePath,
                        background: this.props.downloadInBackground,
                        begin: this.imageDownloadBegin,
                        progress: this.imageDownloadProgress
                    };

                    let download = RNFS.downloadFile(downloadOptions);
                    download.promise
                    .then((res) => {
                        this.downloading = false;
                        this.jobId = null;

                        switch (res.statusCode) {
                            case 404:
                            case 403:
                                return null;
                                break;
                            default:
                                return filePath;
                        }
                    })
                    .catch((err) => {
                        this.deleteFilePath(filePath);
                    });
                })
                .catch((err) => {
                    this.deleteFilePath(filePath);
                });
            });
        }
    };
}
