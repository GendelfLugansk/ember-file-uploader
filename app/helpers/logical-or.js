/*../app/helpers/logical-or.js*/
import Ember from 'ember';

export function logicalOr(params) {
  var result = false;
  for (var i = 0; i < params.length; i++) {
    result = result || !!params[i];
  }
  return result;
}

export default Ember.Helper.helper(logicalOr);
