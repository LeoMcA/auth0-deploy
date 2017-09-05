function (user, context, callback) {
  // /!\ DO NOT EDIT THIS FILE /!\
  // Please use http://github.com/mozilla-iam/auth0-rules instead

  // Applications that are restricted
  // The rule must cover both dev and prod client_ids as the rule is merged from dev to prod.
  var ENABLED_APPS = [
    // Examples:
    //'0123456789abcdefghijKLMNOPQRSTuv',  // auth : egencia.com
    //'123456789abcdefghijKLMNOPQRSTuvw',  // auth-dev : egencia.com
  ];

  var allow = function () {
    callback(null, user, context);
  };

  var deny = function () {
    context.redirect = { url: "https://sso.mozilla.com/forbidden" };
    callback(null, null, context);
  };

  var enabled = ENABLED_APPS.indexOf(context.clientID) + 1;

  if (enabled) {

    var request = require('request');

    var search = function (opts) {
      request({
        url: auth0.baseUrl + '/users',
        headers: {
          Authorization: 'Bearer ' + auth0.accessToken
        },
        qs: {
          search_engine: 'v2',
          include_totals: true,
          per_page: 0,
          q: opts.if
        }
      }, function (err, response, body) {
        if (err) return callback(err);
        if (response.statusCode !== 200) return callback(new Error(body));

        body = JSON.parse(body);
        if (body.total > 0) {
          opts.then();
        } else {
          opts.else();
        }
      });
    };

    var ldap = context.connectionStrategy === 'ad';
    var ldap_exists_for_email = 'identities.provider.raw:ad AND email.raw:' + user.email;
    var github_mfa = context.connectionStrategy === 'github' && user.two_factor_authentication;
    var nda_exists_for_email = 'groups:mozilliansorg_nda AND email.raw:' + user.email;

    if (ldap) {
      allow();
    } else {
      search({
        if: ldap_exists_for_email,
        then: deny,
        else: function () {
          if (github_mfa) {
            allow();
          } else {
            search({
              if: nda_exists_for_email,
              then: deny,
              else: allow
            });
          }
        }
      });
    }

  } else {
    allow();
  }
}
