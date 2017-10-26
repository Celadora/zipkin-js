function toJSONEndpoint(endpoint) {
  if (endpoint === undefined || endpoint.isUnknown()) {
    return undefined;
  }
  const res = {
    serviceName: endpoint.serviceName || '', // undefined is not allowed in v1
  };
  if (endpoint.ipv4) {
    res.ipv4 = endpoint.ipv4;
  }
  if (endpoint.port) {
    res.port = endpoint.port;
  }
  return res;
}

function toJSONAnnotation(ann, endpoint) {
  return {
    value: ann.value,
    timestamp: ann.timestamp,
    endpoint
  };
}

module.exports = function toJsonV1(span) {
  const res = {
    traceId: span.traceId
  };
  if (span.parentId) { // instead of writing "parentId": NULL
    res.parentId = span.parentId;
  }
  res.id = span.id;
  res.name = span.name || ''; // undefined is not allowed in v1

  // Log timestamp and duration if this tracer started and completed this span.
  if (!span.shared) {
    res.timestamp = span.timestamp;
    res.duration = span.duration;
  }

  const jsonEndpoint = toJSONEndpoint(span.localEndpoint);

  let beginAnnotation;
  let endAnnotation;
  let addressKey;
  switch(span.kind) {
    case 'CLIENT':
      beginAnnotation = span.timestamp ? 'cs' : undefined;
      endAnnotation = 'cr';
      addressKey = 'sa';
      break;
    case "SERVER":
      beginAnnotation = span.timestamp ? 'sr' : undefined;
      endAnnotation = 'ss';
      addressKey = 'ca';
      break;
  }

  if (span.annotations.length > 0 || beginAnnotation) { // don't write empty array
    res.annotations = span.annotations.map((ann) => {
      return toJSONAnnotation(ann, jsonEndpoint);
    });
  }

  if (beginAnnotation) {
    res.annotations.push({
      value: beginAnnotation,
      timestamp: span.timestamp,
      jsonEndpoint
    });
    if (span.duration) {
      res.annotations.push({
        value: endAnnotation,
        timestamp: span.timestamp + span.duration,
        jsonEndpoint
      });
    }
  }

  const keys = Object.keys(span.tags);
  if (keys.length > 0 || span.remoteEndpoint) { // don't write empty array
    res.binaryAnnotations = keys.map(key => ({
      key,
      value: span.tags[key],
      endpoint: jsonEndpoint
    }));
  }

  if (span.remoteEndpoint) {
    const address = {
      key: addressKey,
      value: true,
      endpoint: toJSONEndpoint(span.remoteEndpoint)
    };
    res.binaryAnnotations.push(address);
  }

  if (span.debug) { // instead of writing "debug": false
    res.debug = true;
  }
  return JSON.stringify(res);
};