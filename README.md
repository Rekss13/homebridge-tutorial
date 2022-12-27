# HomeBridge Plugin Development Tutorial

## Introduction

Before going further please,
* Make sure that you have an iPhone
* Install [Homebridge](http://homebridge.io) on your preferred computer; i.e. Mac, PC, or Raspberry pi
* Add homebridge to your HomeKit

## Bringing up plugin and adding an accessory
[Based on homebridge-tutorial](https://github.com/senscho/homebridge-tutorial)

Videos from the original manual do not open.

Homebridge Plugin is in a form of NodeJS Module so the first step is to creat a module. Homebridge only searches module with name starting with "homebridge-" and checks the keyword section of package.json file; the keyword should be homebridge-plugin.

I made a directory "homebridge-tutorial" to store my codes. Under the directory two files are required to be a module: i.e. index.js and package.json.

index.js
```js
// index.js
"use strict";
module.exports = function (homebridge) {
};
```

package.json
```json
{
  "name": "homebridge-tutorial",
  "version": "0.0.2",
  "description": "Description for Homebridge Tutorial",
  "license": "the most strict license",
  "keywords": [
    "homebridge-plugin"
  ],
  "engines": {
    "node": ">=10.17.0",
    "homebridge": ">=0.4.8"
  },
  "dependencies": {}
}
```

Now time to install my module so that homebridge can load. In the directory where package.json lives, run the following command. It will create a symbolic link in nodejs module path that points our module directory.
```
sudo ln /home/[user_name]/homebridge-tutorial /var/lib/homebridge/node_modules/homebridge-tutorial
```

Refresh your homebridge config web interface. Plugin should be found there.

**Adding an accessory**

When homebridge code calls our module it passes itself. We added an argument of our function called 'homebridge' to recieve it. Note that name can be anything.

Now with homebridge object, we can call homebridge related function so we call homebridge object an API (application programming interface).

To add an accessory, call registerAccessory function of homebridge object as shown in the example below.

```js
module.exports = function (homebridge) {
   homebridge.registerAccessory("homebridge-tutorial", "URRI Volume", volume); 
};
```
When we call this API function, homebridge wants to know which plugin is calling it. That is why it requires the first argument to be the plugin name. Second argument is accessory name and it can be anything. In many homekit products, it is usually the product name. The last one is called a constructor. Constructor is what we will define and it is the core of our accessory.

Now save index.js and restart homebridge then print out the log.
```
$ sudo hb-service restart <- restart homebridge
$ hb-service logs <- see logs. Ctrl+C to stop
```

This will print out some error because we have not defined the constructor. And it is proof that our plugin is loaded by homebridge. So we made a progress
```
[6/18/2020, 2:49:59 AM] ERROR INITIALIZING PLUGIN homebridge-tutorial:
[6/18/2020, 2:49:59 AM] ReferenceError: volume is not defined ...
```

**Constructor Definition**

```js
function volume(log, config, api) {
    this.log = log;
    this.config = config;
    this.homebridge = api;

    this.defaultVolume = typeof this.config.defaultVolume == 'number' ? this.config.defaultVolume : 10;

    this.log(`Volume accessory ${this.config.name} is Created!`);
    this.log(`${this.config.name} defaultVolume is ${this.defaultVolume}`);
};
```
After adding this code, restarting homebrdige won't generate errors. Instead it says
```
[12/27/2022, 2:24:13 PM] Loaded plugin: homebridge-tutorial@0.0.2
[12/27/2022, 2:24:13 PM] Registering accessory 'homebridge-tutorial.URRI Volume'
```
**Create Accessory Instances**

Add accessories in config.json file, which is homebridge's configuration file. Please properly use the commas not to get any errors.
```json
"accessories": [
        {
            "name": "TV Volume",
            "accessory": "URRI Volume",
            "address": "192.168.1.206"
        },
        {
            "name": "Radio Volume",
            "accessory": "URRI Volume",
            "defaultVolume": 90
        }
    ]
```
Homebridge will call our constructor for each accessory. It also calls getServices to know what devices are included in my accessory. For example, despite of the accessory name, URRI Volume may contain a lightbulb and a fan.

In the description of the accessory, you can specify its ip address, if this is not done, an attempt will be made to connect to localhost.

We have to define getServices function like below. Currently, we do not return any service, which means that there will be no actual device showing in homekit.

```js
volume.prototype = {
    getServices: function() {}
}
```

When homebridge calls our constructor. It passes three variables. The first one is log. Using this object, my plugin can write into homebridge's log file. Second one is configuration file. In case of above example, "defaultVolume: 90" is passed by this variable. Last one is again the homebridge object itself.

In our volume constructor function, we first store the three passed variabled in 'this' for later use. Then, check if defaultVolume is defined for the accessory. If defined store the value in 'this' again. If not defined store a default of defaultVolume, which is 10.

Lastly, prints out some strings in log file. What do you expect to see from the log?? Here it is.

```
[12/27/2022, 2:24:13 PM] [TV Volume] Initializing URRI Volume accessory...
[12/27/2022, 2:24:13 PM] [TV Volume] Volume accessory TV Volume is Created!
[12/27/2022, 2:24:13 PM] [TV Volume] TV Volume defaultVolume is 10
[12/27/2022, 2:24:13 PM] [Radio Volume] Initializing URRI Volume accessory...
[12/27/2022, 2:24:13 PM] [Radio Volume] Volume accessory Radio Volume is Created!
[12/27/2022, 2:24:13 PM] [Radio Volume] Radio Volume defaultVolume is 90
```

So far, our code had nothing to do with Homekit. The real homekit thing is here called service. Let's add a lightbulb service in our plugin.

**Adding a lightbulb Service**

Now we will add lightbulb Service in Constructor function. Before moving on let's define some useful global variables for convenience. Service and Characteristic objects are two key objects that we will be frequently using so I am giving them short names. Place the following code right before the "registerAccessory" function. 

```js
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
```

Now let's add Service in volume function.

```js
    this.bulb = new Service.Lightbulb(this.config.name);
    // Set up Event Handler for bulb on/off
    this.bulb.getCharacteristic(Characteristic.On)
        .on("get", this.getPower.bind(this))
        .on("set", this.setPower.bind(this));
    
    this.log('all event handler was setup.')
```
"new" will create a lightbulb service with the name defined in config; i.e. TV Volume or Radio Volume from homebridge's config.json file. You will see the names dispalyed in you home app tiles.

Homekit's lightbulb requires "On Characterstic" to be defined. "On Characteristic" is about the state of the lightbulb, i.e. on or off. You have to defines two event handlers; (1) event when homekit asks current lightbulb state and (2) event when user changed the lightbulb state in home app. They are called get and set events. To define the event handlers, we first get the Characteristic object using getCharacteristic function. Use .on function to add event handlers to get and set events.

Finally we added a service. So let's update getService function again. It should return information about this accessory and the created service.
```js
    {
        if (!this.bulb) return [];
        this.log('Homekit asked to report service');
        const infoService = new Service.AccessoryInformation();
        infoService.setCharacteristic(Characteristic.Manufacturer, 'URRI');
        return [infoService, this.bulb];
    }
```
First if the service is not created yet, return nothing. Then, we create information object and add some information. I added Manufacturer information but there are more you can add. Finally, we return information and the service that we created. 

Now the last step! We need to define the event handlers. For get event, we return the current state. For now let's always return true. For set event, we do nothing. Note that all event handler is given 'callback' function we must be called only 'once'. Event driven programming is asynchronous; i.e. after homebridge calls one of this handler it does not wait the handler finishes its job. It is our event handler to call 'callback' function which is part of homebridge that takes care of things after handler finishes all job. The first argument of homebrige's callback is always err. For now we use null to indicate no error. 

```js
volume.prototype = {
    getServices: function() {
        // ... already defined above
    },    
    getPower: function(callback) {
        this.log('Homekit Asked Power State');
        callback(null,true)
    },
    setPower: function(on, callback) {
        this.log('Homekit Gave New Power State' + ' ' + on);
        callback(null)
    }
}
```

Now restart homebridge and open your iphone. Voila! You see two lightbulb accessories in your home app.

## Event Handling

**User Scenario Specification**

Before we write up any code in event handler, we have to define what to implement. Sometimes people are not patient and rush into coding but this will make things complicated unless you are lucky. Knowing what you will code is very important.

Here is what I defined as use cases.

(1) User tap lightbulb tile to mute or unmute the speaker
* lightbulb off -> volume becomes zero
* lightbulb on -> volume becomes defaultVolume

(2) User slide lightbulb slidebar to between 0~100
* brightness set to x % -> volume becomes x

For the first use case, we make use of ON Characteristics. For the next one, we do of Brightness Characteristics.

**Homekit Callback Scenarios**

(1) Homekit UI update (eg. open home app, etc)
* On Characteristic -> Get
* Brightness Characteristic -> Get

(2) Tile toggle
* Brightness Characteristic -> Set 100%
* On Characteristic -> Set True

(3) Slider change
* Brightness Characteristic -> Set x %
* On Characteristic -> Set x (True if x>0, False otherwise)

**Volume Control Code**

How to adjust volume of a speaker device depends on the hardware. Some speaker does not have this capability at all; some can be impelmented very easily whereas some can't. For this reason, I'll not go in details about this.

In my case, I have a URRI network stereo receiver in my living room. My plugin (NodeJS) needs to communicate directly with the device and I think the most elegant way is to use [REST](https://en.wikipedia.org/wiki/Representational_state_transfer).

Long story short, I need to code the following in NodeJS for given tasks.
* HTTP POST to http://127.0.0.1:5000/setVolume/:volume with  volume data "volume":xx will change the volume to xx.
* HTTP POST from http://127.0.0.1:5000/getVolume will return current volume information

## Coding to Complete

**Add Brightness Slider**

Just like we added On Characteristic, Adding a Brightness Characteristic of bulb service will add a slider to the UI.

```js
this.bulb.getCharacteristic(Characteristic.On)
    .on("get", this.getPower.bind(this))
    .on("set", this.setPower.bind(this));
this.bulb.getCharacteristic(Characteristic.Brightness)
    .on("get", this.getVolume.bind(this))
    .on("set", this.setVolume.bind(this));
```

**Getting Power State and Volume**

According to my experiment, get brightness is always called after get power state. We impelment speaker volume reading in get power state using http module. The HW volume data is stored as this.vol and getPower reports this.vol>0 to homebridge.

Soon after getPower is called, getVolume is called. Since this.vol is already updated, the function simply reports this.vol value.

```js
function volume(log, config, api) {
    // ... existing codes
    this.address = typeof this.config.address == 'string' ? this.config.address : 'localhost';
}

getPower: function (callback) {
    this.log('Homekit Asked Power State');
    this.log('getPower');

    this._send(`/getVolume`, (error, result) => {
        if (!error) {
            const vol = parseInt(result, 10);
            this.log('Read from URRI; volume: ' + vol);
            this.vol = vol;
            callback(null, this.vol > 0);
        } else {
            callback(result);
        }
    });
},
getVolume: function (callback) {
    this.log('getVolume');
    // callback with volume read in getPower
    callback(null, this.vol);
},
_send(path, callback) {
    const req = http.request({
        host: this.address, port: 9032,
        path: path, method: 'POST'
    }, res => {
        res.setEncoding('utf8');
        res.on('data', chunk => {
            this.log(`BODY: ${chunk}`);
            callback(false, chunk);
        });
        res.on('end', () => {});
    });

    req.on('error', (err) => {
        this.log(`problem with request: ${err.message}`);
        callback(true, err);
    });

    req.end();
}
```
**Setting Power State and Volume**

User's toggle and slide actions should be distinguished because both actions will cause setPower event. From experiment, assuming that setPower is always called after setVolume is fair. So in setVolume, we define a variable (triggeredby) to indicate that setVolume is just called. In setPower, the variable is checked so if setVolume is called right before, it will use the volume from UI to adjust HW. If not, it is from tile UI, which is toggling, the volume is either set to 0 or defaultValue.

The HW adjustment is again via http module. 

After sending a command to speaker HW in setPower, UI update is called. UI update function asks homekit UI to be updated after 100ms delay. This is necessary because upon toggling on action, homekit UI assumes 100% brightness; the actual HW volume is not 100% but UI thinks it is 100%. The 100ms is enough to wait until homekit change the UI to 100%, and our update code will ask UI change to the right value.

```js
setPower: function (on, callback) {
    let new_vol;
    if (this.triggeredby == 'slider') {
        this.log('setPower triggered by slider')
        new_vol = this.vol;
        delete this.triggeredby;
    } else {
        this.log('setPower ' + on)
        new_vol = on ? this.defaultVolume : 0;
    }

    this._send(`/setVolume/${new_vol}`, (error, result) => {
        if (!error) {
            this.log('Request sent to set volume to ' + new_vol);
            this.vol = new_vol;
            this.updateUI();
            callback(null);
        } else {
            callback(result);
        }
    });
},
setVolume: function (vol, callback) {
    if (vol == 100) { callback(null); return; }
    this.log('setVolume ' + vol);

    this.triggeredby = 'slider';

    this._send(`/setVolume/${vol}`, (error, result) => {
        if (!error) {
            this.log('Request sent to set volume to ' + vol);
            this.vol = vol;
            this.updateUI();
            callback(null);
        } else {
            callback(result);
        }
    });
},
updateUI: function () {
    setTimeout(() => {
        this.bulb.getCharacteristic(Characteristic.Brightness).updateValue(this.vol);
        this.bulb.getCharacteristic(Characteristic.On).updateValue(this.vol > 0);
    }, 100);
},
```

**Polling**

If an external non-homkit device changes the volume of speaker HW, homekit never knows. In this case, homekit UI and our plugin shall have wrong information. For this reason, I implemented a polling mechanism, which checks the volume of speaker HW per every 1 sec and update the UI.

```js
function volume(log, config, api) {
    // ... existing codes
    this.refreshInterval = typeof this.config.refreshInterval == 'number' ? this.config.refreshInterval : 1000;

    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
}

poll: function() {
    if(this.timer) clearTimeout(this.timer);
    this.timer = null;

    // volume update from URRI
    this.getPower( (err, poweron) => {  //this.vol updated.
        // update UI
        this.updateUI();
    });

    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
    }
```
