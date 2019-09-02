import PropTypes from 'prop-types';
import React from 'react';
import RNFS, { DocumentDirectoryPath } from 'react-native-fs';

const SHA1 = require("crypto-js/sha1");
const URL = require('url-parse');


module.exports = (path = '', options = {}) => {
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

                  // before we change the cachedImagePath.. if the previous cachedImagePath was set.. remove it
                  if (this.state.cacheable && this.state.cachedImagePath) {
                      let delImagePath = this.state.cachedImagePath;
                      this._deleteFilePath(delImagePath);
                  }

                  let downloadOptions = {
                      fromUrl: imageUri,
                      toFile: filePath,
                      background: this.props.downloadInBackground,
                      begin: this.imageDownloadBegin,
                      progress: this.imageDownloadProgress
                  };

                  let download = RNFS.downloadFile(downloadOptions);

                  this.downloading = true;
                  this.jobId = download.jobId;

                  download.promise
                  .then((res) => {
                      this.downloading = false;
                      this.jobId = null;

                      switch (res.statusCode) {
                          case 404:
                          case 403:
                              this.setState({cacheable: false, cachedImagePath: null});
                              break;
                          default:
                              this.setState({cacheable: true, cachedImagePath: filePath});
                      }
                  })
                  .catch((err) => {
                      // error occurred while downloading or download stopped.. remove file if created
                      this._deleteFilePath(filePath);

                      // If there was no in-progress job, it may have been cancelled already (and this component may be unmounted)
                      if (this.downloading) {
                          this.downloading = false;
                          this.jobId = null;
                          this.setState({cacheable: false, cachedImagePath: null});
                      }
                  });
              })
              .catch((err) => {
                  this._deleteFilePath(filePath);
                  this.setState({cacheable: false, cachedImagePath: null});
              });
          });
      }

    };
}
