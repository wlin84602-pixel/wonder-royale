// Retired private editor links return to the normal game without reading saved layouts.
(function(){const u=new URL(location.href);if(u.searchParams.has('sandbox')||u.searchParams.has('customLayout')){u.searchParams.delete('sandbox');u.searchParams.delete('customLayout');u.searchParams.delete('offline');location.replace(u.href)}})();
