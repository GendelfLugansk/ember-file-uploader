/*../app/controllers/index.js*/
import Ember from 'ember';

export default Ember.Controller.extend({
  url: '/upload/',
  title: '',
  _uploader: null,
  errors: [],
  actions: {
    submit: function () {
      const that = this;
      this.set('errors', []);
      this._uploader.upload({
        url: this.get('url'),
        data: {
          title: this.get('title')
        }
      }).then(
        function (payload) {
          console.log(payload);
        },
        function (response) {
          if (response.message) {
            that.set('errors', [response.message, null, 'Something happen']);
          }
          console.log(response);
        }
      );
    },
    uploaderInit: function (uploader) {
      this._uploader = uploader;
    }
  }
});
