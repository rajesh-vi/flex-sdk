/**
 * Copyright (c) 2016 Kinvey Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const data = require('./service/data');
const isNil = require('lodash.isnil');
const flex = require('../package.json');
const functions = require('./service/functions');
const auth = require('./service/auth');
const moduleGenerator = require('./service/moduleGenerator');
const logger = require('./service/logger');
const receiver = require('kinvey-code-task-runner');

class Flex {
  constructor(options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
    }

    options = options || {};

    options.type = process.env.SDK_RECEIVER === 'tcp' ? 'tcp' : 'http';

    if (options.type === 'tcp') {
      delete options.host;
      delete options.port;
    }

    this.data = this.dataLink = data;
    this.functions = this.businessLogic = functions;
    this.auth = auth;
    this.logger = logger;
    this.moduleGenerator = moduleGenerator;
    this.version = flex.version;

    // TODO Remove legacy taskType values
    const taskReceivedCallback = ((task, completionCallback) => {
      task.sdkVersion = this.version;
      if (!this[task.taskType] || task.taskType === 'logger' || task.taskType === 'moduleGenerator') {
        return new Error('Invalid task Type');
      }

      if (task.taskType === 'serviceDiscovery') {
        task.discoveryObjects = {
          dataLink: {
            serviceObjects: this.data.getServiceObjects()
          },
          businessLogic: {
            handlers: this.functions.getHandlers()
          },
          auth: {
            handlers: this.auth.getHandlers()
          }
        };
        return completionCallback(null, task);
      }

      return this[task.taskType].process(task, this.moduleGenerator.generate(task), completionCallback);
    });

    receiver.start(options, taskReceivedCallback, (err) => {
      if (!isNil(err)) {
        return callback(new Error(`Could not start task receiver: ${err}`));
      }
      return callback(null, this);
    });
  }
}

function generateFlexService(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }

  return new Flex(options, (err, service) => {
    callback(err, service);
  });
}

exports.service = generateFlexService;
