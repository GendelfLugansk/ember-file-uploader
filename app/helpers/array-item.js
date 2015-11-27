/*../app/helpers/array-item.js*/
import Ember from 'ember';

export default Ember.Handlebars.makeBoundHelper(function (array, index) {
  return array !== undefined && array[index] !== undefined ? array[index] : undefined;
});