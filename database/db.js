const { supabaseApi } = require('./init');

function db(tableName) {
  function filterStr(where) {
    var keys = Object.keys(where);
    if (keys.length === 0) return '';
    return keys.map(function(k) {
      return k + '=eq.' + encodeURIComponent(where[k]);
    }).join('&');
  }

  return {
    all: function() {
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&order=id.asc');
    },
    getById: function(id) {
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&id=eq.' + id).then(function(r) { return r && r.length ? r[0] : null; });
    },
    findOne: function(where) {
      var f = filterStr(where);
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&' + f + '&limit=1').then(function(r) { return r && r.length ? r[0] : null; });
    },
    find: function(where) {
      var f = filterStr(where);
      return supabaseApi('GET', '/rest/v1/' + tableName + '?select=*&order=id.asc' + (f ? '&' + f : ''));
    },
    insert: function(record) {
      return supabaseApi('POST', '/rest/v1/' + tableName + '?select=*', record).then(function(r) { return r && r.length ? r[0] : null; });
    },
    update: function(id, updates) {
      return supabaseApi('PATCH', '/rest/v1/' + tableName + '?id=eq.' + id + '&select=*', updates).then(function(r) { return r && r.length ? r[0] : null; });
    },
    delete: function(id) {
      return supabaseApi('DELETE', '/rest/v1/' + tableName + '?id=eq.' + id);
    }
  };
}

module.exports = { db };
