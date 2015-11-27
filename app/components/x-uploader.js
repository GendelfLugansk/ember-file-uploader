/*../app/components/x-uploader.js*/
import Ember from 'ember';
import numeral from 'npm:numeral';

/**
 * This structure will contain a file, it's state (valid/invalid) and error message
 *
 * @param file
 * @param valid
 * @param error
 * @returns {*}
 * @constructor
 */
function QueuedFile(file, valid, error) {
  this.file = file;
  this.valid = !!valid;
  this.error = typeof error === "string" ? error : null;

  return Ember.Object.create(this);
}

/**
 * MultipleUploader stores files and
 * has a method to upload files. We will
 * send a reference to this object to controller,
 * so controller will be able to initiate upload.
 *
 * @constructor
 */
function MultipleUploader(options) {
  /**
   * Default options
   *
   * @type {{url: null, fieldName: string, headers: {}, data: {}, method: string}}
   * @private
   */
  const _defaultOptions = {
    validate: function (file) {
      return true;
    },
    url: null,
    fieldName: 'Files[]',
    headers: {},
    data: {},
    method: 'POST'
  };
  /**
   * In this array files are stored
   *
   * @type {Array}
   * @private
   */
  const _files = [];
  /**
   * This object stores event handlers
   *
   * @type {{}}
   * @private
   */
  const _eventHandlers = {};

  /**
   * Merge default options with options, passed during construction
   */
  this.options = Ember.$.extend({}, _defaultOptions, options);

  /**
   * This function triggers an event
   *
   * @param event
   */
  const trigger = function (event) {
    if (_eventHandlers[event] !== undefined) {
      for (var i = 0; i < _eventHandlers[event].length; i++) {
        _eventHandlers[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
      }
    }
  };

  /**
   * This method saves files from FileList to _files array
   *
   * @param files
   * @returns {boolean}
   */
  this.addFiles = function (files) {
    var errorMessage;
    var qf;
    var filesAdded = 0;

    for (var i = 0; i < files.length; i++) {
      if ((errorMessage = this.options.validate(files[i])) === true) {
        qf = new QueuedFile(files[i], true);
      } else if (errorMessage === false) {
        continue;
      } else {
        qf = new QueuedFile(files[i], false, errorMessage);
      }
      _files.push(qf);
      filesAdded++;
      trigger('fileadded', qf);
    }

    if (filesAdded > 0) {
      trigger('fileschanged', _files.slice());
      return true;
    }

    return false;
  };

  /**
   * This method will remove file
   *
   * @param qf
   * @returns {boolean}
   */
  this.removeFile = function (qf) {
    var pos;
    if ((pos = _files.indexOf(qf)) > -1) {
      _files.splice(pos, 1);
      trigger('fileremoved', qf);
      trigger('fileschanged', _files.slice());
      return true;
    }

    return false;
  };

  /**
   * This method returns all files
   *
   * @returns {Array}
   */
  this.getAllFiles = function () {
    return _files.slice();
  };

  /**
   * This method returns valid files
   *
   * @returns {Array}
   */
  this.getValidFiles = function () {
    const files = [];
    for (var i = 0; i < _files.length; i++) {
      if (_files[i].valid) {
        files.push(_files[i]);
      }
    }

    return files;
  };

  /**
   * This method will upload files
   */
  this.upload = function (options) {
    /**
     * Create FormData instance
     */
    const formData = new FormData();
    /**
     * Merge current options with options, passed to this method. So,
     * if you pass an url or data to upload method, it will overwrite options passed
     * to constructor
     */
    const opts = Ember.$.extend({}, this.options, options);
    /**
     * Attach data
     */
    for (var k in opts.data) {
      if (opts.data.hasOwnProperty(k)) {
        formData.append(k, opts.data[k]);
      }
    }
    /**
     * Attach valid files
     */
    const files = this.getValidFiles();
    for (var i = 0; i < files.length; i++) {
      formData.append(opts.fieldName, files[i].file);
    }
    return new Ember.RSVP.Promise(function (resolve, reject) {
      Ember.$.ajax({
        type: opts.method,
        url: opts.url,
        headers: opts.headers,
        data: formData,
        contentType: false,
        processData: false,
        error: function (jqXHR) {
          var error = jqXHR.responseText;
          try {
            error = JSON.parse(error);
          } catch (e) {
            error = new Ember.Error(error);
          }
          reject(error);
        },
        success: function (data) {
          resolve(data);
        }
      });
    });
  };

  /**
   * This method attaches event handler
   *
   * @param event
   * @param handler
   */
  this.on = function (event, handler) {
    if (_eventHandlers[event] === undefined) {
      _eventHandlers[event] = [];
    }
    _eventHandlers[event].push(handler);
  };

  /**
   * This method detaches event handler
   *
   * @param event
   * @param handler
   */
  this.off = function (event, handler) {
    if (_eventHandlers[event] !== undefined) {
      for (var i = 0; i < _eventHandlers[event].length; i++) {
        if (_eventHandlers[event][i] === handler) {
          _eventHandlers[event].splice(i, 1);
          break;
        }
      }
    }
  };
}

export default Ember.Component.extend({
  classNames: ['x-uploader'],

  /**
   * Component's parameters
   */
  name: "Files[]",
  acceptedTypes: '*/*,*',
  maxFileSize: '3MB',
  maxFiles: 20,
  thumbWidth: 300,
  thumbHeight: 169,
  addLabel: 'Click here to add files',
  msgWrongFileType: 'Wrong file type',
  msgMaxFileSize: 'File is too big ({fileSize}). Max file size is {maxFileSize}.',
  msgFileCounter: 'Selected {count} / {maxFiles} files',

  /**
   * Queue
   */
  queue: null,

  onInit: null,

  _input: null,

  counter: Ember.computed('queue.@each', function () {
    var count = 0;
    if (this._uploader) {
      count = this._uploader.getValidFiles().length;
    }
    var maxFiles = this.get('maxFiles');

    return this.get('msgFileCounter').toString().replace('{count}', count).replace('{maxFiles}', maxFiles);
  }),

  init() {
    this._super.apply(this, arguments);
    this.set('queue', Ember.ArrayProxy.create({content: []}));
  },

  didInsertElement() {
    var that = this;
    /**
     * Create an instance of MultipleUploader and save it
     *
     * @type {MultipleUploader}
     */
    this._uploader = new MultipleUploader({
      fieldName: this.get('name'),
      validate: function (file) {
        /**
         * This code will check a number of files added
         */
        var maxFiles = that.get('maxFiles');
        if (typeof maxFiles === 'number' && that._uploader.getValidFiles().length >= maxFiles) {
          return false;
        }

        /**
         * This will prevent duplicates from adding to list
         */
        const files = that._uploader.getAllFiles();
        for (var i = 0; i < files.length; i++) {
          if (file.name === files[i].file.name && file.size === files[i].file.size) {
            return false;
          }
        }

        /**
         * This will check file type
         */
        const acceptedTypes = that.get('acceptedTypes').split(',');
        const escapeRegExp = /[|\\{}()[\]^$+?.]/g;
        var passTypeTest = false;
        for (i = 0; i < acceptedTypes.length; i++) {
          var test = new RegExp(acceptedTypes[i].replace(escapeRegExp, '\\$&').replace(/\*/g, '.*'), 'g');
          if (test.test(file.type)) {
            passTypeTest = true;
            break;
          }
        }
        if (!passTypeTest) {
          return that.get('msgWrongFileType').toString();
        }

        /**
         * This will check file size
         */
        const maxFileSize = that.get('maxFileSize');
        if (typeof maxFileSize === "string") {
          const bytes = numeral().unformat(maxFileSize);
          if (bytes < file.size) {
            return that.get('msgMaxFileSize')
              .toString()
              .replace('{fileSize}', numeral(file.size).format('0.0b'))
              .replace('{maxFileSize}', maxFileSize);
          }
        }

        return true;
      }
    });

    /**
     * Attach 'fileadded' event handler
     */
    this._uploader.on('fileadded', function (qf) {
      that.get('queue').addObject(qf);
      const imageType = /^image\//;
      const thumbWidth = that.get('thumbWidth');
      const thumbHeight = that.get('thumbHeight');

      if (imageType.test(qf.file.type)) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var image = new Image();
          image.src = reader.result;

          image.onload = function () {
            var width = image.width;
            var height = image.height;
            var shouldResize = (width > thumbWidth) && (height > thumbHeight);

            var newWidth;
            var newHeight;

            if (shouldResize) {
              const largest = Math.max(thumbHeight, thumbWidth);
              if (width > height) {
                newWidth = width * (largest / height);
                newHeight = largest;
              } else {
                newHeight = height * (largest / width);
                newWidth = largest;
              }
            } else {
              newWidth = width;
              newHeight = height;
            }

            var canvas = document.createElement('canvas');

            canvas.width = thumbWidth;
            canvas.height = thumbHeight;

            var context = canvas.getContext('2d');

            context.drawImage(this, (thumbWidth - newWidth) / 2, (thumbHeight - newHeight) / 2, newWidth, newHeight);

            qf.set('thumbnail', canvas.toDataURL());
          };
        };

        Ember.run.once(reader, 'readAsDataURL', qf.file);
      }
    });

    /**
     * Attach 'fileremoved' event handler
     */
    this._uploader.on('fileremoved', function (qf) {
      that.get('queue').removeObject(qf);
    });

    this._generateInput();

    const dropzone = Ember.$(this.element);
    dropzone.on('dragover', function (event) {
      event.preventDefault();
      event.stopPropagation();
      dropzone.addClass('hover');
      return false;
    });

    dropzone.on('dragleave', function (event) {
      event.preventDefault();
      event.stopPropagation();
      dropzone.removeClass('hover');
      return false;
    });

    dropzone.on('drop', function (event) {
      event.preventDefault();
      event.stopPropagation();
      that._uploader.addFiles(event.originalEvent.dataTransfer.files);
      dropzone.removeClass('hover');
      dropzone.addClass('drop');
    });

    /**
     * Send action to controller so it will be able to use _uploader object to initiate upload
     */
    this.sendAction('onInit', this._uploader);
  },

  /**
   * Generates file input that needed to open file selection dialog
   *
   * @private
   */
  _generateInput() {
    const that = this;
    /**
     * If we already have an input, remove it
     */
    if (this._input && this._input.remove) {
      this._input.remove();
    }
    /**
     * Create new input
     */
    this._input = Ember.$('<input type="file" name="' + this.get('name') + '" accept="' + this.get('acceptedTypes') + '" multiple="multiple" />');
    /**
     * On change (user selected files) add files to upload and regenerate input to clear it
     */
    this._input.on('change', function () {
      that._uploader.addFiles(this.files);
      that._generateInput();
    });
    /**
     * Append input to component
     */
    this._input.appendTo(this.element);
  },

  actions: {
    remove(qf) {
      this._uploader.removeFile(qf);
    },
    add() {
      this._input.click();
    }
  }
});
