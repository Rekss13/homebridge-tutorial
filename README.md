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
  "version": "0.0.4",
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
sudo ln -s /home/[user_name]/homebridge-tutorial /var/lib/homebridge/node_modules/homebridge-tutorial
```

Refresh your homebridge config web interface. Plugin should be found there.

**Adding an accessory**

When homebridge code calls our module it passes itself. We added an argument of our function called 'homebridge' to recieve it. Note that name can be anything.

Now with homebridge object, we can call homebridge related function so we call homebridge object an API (application programming interface).

To add an accessory, call registerAccessory function of homebridge object as shown in the example below.

```js
module.exports = (api) => {
    api.registerAccessory("URRI Volume", UrriVolumePlugin);
}
```
When we call this API function, homebridge wants to know which plugin is calling it. That is why it requires the first argument to be the plugin name. Second argument is accessory name and it can be anything. In many homekit products, it is usually the product name. The last one is called a constructor. Constructor is what we will define and it is the core of our accessory.

Now save index.js and restart homebridge then print out the log.
```
$ sudo hb-service restart <- restart homebridge
$ hb-service logs <- see logs. Ctrl+C to stop
```

This will print out some error because we have not defined the constructor. And it is proof that our plugin is loaded by homebridge. So we made a progress
```
[12/28/2022, 6:36:00 AM] Loaded plugin: homebridge-tutorial@0.0.4
[12/28/2022, 6:36:00 AM] ====================
[12/28/2022, 6:36:00 AM] ERROR INITIALIZING PLUGIN homebridge-tutorial:
```

**Constructor Definition**

```js
class UrriVolumePlugin {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.vol = 0;
        this.defaultVolume = typeof this.config.defaultVolume == 'number' ? this.config.defaultVolume : 10;

        this.log.info(`Volume accessory ${this.config.name} is Created!`);
        this.log.info(`${this.config.name} defaultVolume is ${this.defaultVolume}`);
    }
}
```
After adding this code, restarting homebrdige won't generate errors. Instead it says
```
[12/28/2022, 6:44:19 AM] Loaded plugin: homebridge-tutorial@0.0.4
[12/28/2022, 6:44:19 AM] Registering accessory 'homebridge-tutorial.URRI Volume'
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
getServices() {
    return [];
}
```

When homebridge calls our constructor. It passes three variables. The first one is log. Using this object, my plugin can write into homebridge's log file. Second one is configuration file. In case of above example, "defaultVolume: 90" is passed by this variable. Last one is again the homebridge object itself.

In our volume constructor function, we first store the three passed variabled in 'this' for later use. Then, check if defaultVolume is defined for the accessory. If defined store the value in 'this' again. If not defined store a default of defaultVolume, which is 10.

Lastly, prints out some strings in log file. What do you expect to see from the log?? Here it is.

```
[12/28/2022, 6:45:39 AM] [TV Volume] Initializing URRI Volume accessory...
[12/28/2022, 6:45:39 AM] [TV Volume] Volume accessory TV Volume is Created!
[12/28/2022, 6:45:39 AM] [TV Volume] TV Volume defaultVolume is 10
[12/28/2022, 6:45:39 AM] [TV Volume] Initializing URRI Volume accessory...
[12/28/2022, 6:45:39 AM] [TV Volume] Volume accessory TV Volume is Created!
[12/28/2022, 6:45:39 AM] [TV Volume] TV Volume defaultVolume is 10
```

So far, our code had nothing to do with Homekit. The real homekit thing is here called service. Let's add a lightbulb service in our plugin.

**Adding a lightbulb Service**

Now we will add lightbulb Service in Constructor function. Before moving on let's define some useful global variables for convenience. Service and Characteristic objects are two key objects that we will be frequently using so I am giving them short names. Put the following code in the constructor. 

```js
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
```

First, let's describe our device. The code below needs to be added to the constructor.

```js
this.infoService = new this.Service.AccessoryInformation()
    .setCharacteristic(this.Characteristic.Manufacturer, "URRI")
    .setCharacteristic(this.Characteristic.Model, "URRI receiver Volume control");
```

Now let's add the Service function to the constructor.

```js
    this.bulb = new this.Service.Lightbulb(this.config.name);
    // Set up Event Handler for bulb on/off
    this.bulb.getCharacteristic(this.Characteristic.On)
        .onGet(this.getOnHandler.bind(this))
        .onSet(this.setOnHandler.bind(this));
    this.log.info('all event handler was setup.');
```
"new" will create a lightbulb service with the name defined in config; i.e. TV Volume or Radio Volume from homebridge's config.json file. You will see the names dispalyed in you home app tiles.

Homekit's lightbulb requires "On Characterstic" to be defined. "On Characteristic" is about the state of the lightbulb, i.e. on or off. You have to defines two event handlers; (1) event when homekit asks current lightbulb state and (2) event when user changed the lightbulb state in home app. They are called get and set events. To define the event handlers, we first get the Characteristic object using getCharacteristic function. Use .on function to add event handlers to get and set events.

Finally we added a service. So let's update getService function again. It should return information about this accessory and the created service.
```js
getServices() {
    return [this.infoService, this.bulb];
}
```
First if the service is not created yet, return nothing. Then, we create information object and add some information. I added Manufacturer information but there are more you can add. Finally, we return information and the service that we created. 

Now the last step! We need to define event handlers. For the get event, we return the current state. For now, let's always return true. For the set event, we do nothing. Event-driven programming is asynchronous; that is, after homebridge calls one of these handlers, it does not wait for the handler to complete its work.

```js
getServices() {
    // ... already defined above
}
async getOnHandler() {
    this.log.debug('Homekit Asked On State');
    return true;
}
async setOnHandler(value) {
    this.log.info('OnHandler state to:', value);
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
this.bulb.getCharacteristic(this.Characteristic.On)
    .onGet(this.getOnHandler.bind(this))
    .onSet(this.setOnHandler.bind(this));
this.bulb.getCharacteristic(this.Characteristic.Brightness)
    .onGet(this.getBrightnessHandler.bind(this))
    .onSet(this.setBrightnessHandler.bind(this));
```

**Getting Power State and Volume**

According to my experiment, get brightness is always called after get power state. We impelment speaker volume reading in get power state using http module. The HW volume data is stored as this.vol and getPower reports this.vol>0 to homebridge.

Soon after getPower is called, getVolume is called. Since this.vol is already updated, the function simply reports this.vol value.

```js
constructor(log, config, api) {
    // ... existing codes
    this.address = typeof this.config.address == 'string' ? this.config.address : 'localhost';
}

async getOnHandler() {
    this.log.debug('Homekit Asked On State');
    try {
        this.vol = await this._getData();
        this.bulb.updateCharacteristic(this.Characteristic.Brightness, this.vol);
    } catch (error) {
        this.bulb.updateCharacteristic(this.Characteristic.On, new Error(error));
    } finally {
        return this.vol > 0;
    }
}
async getBrightnessHandler() {
    this.log.debug('Homekit Asked Brightness State');
    return this.vol;
}
updateUI() {
    this.bulb.updateCharacteristic(this.Characteristic.On, this.vol > 0);
    this.bulb.updateCharacteristic(this.Characteristic.Brightness, this.vol);
}
_getData() {
    return new Promise((resolve, reject) => {
        this._send(`/getVolume`, (error, result) => {
            if (!error) {
                const volume = parseInt(result, 10);
                this.log.debug('Read from URRI; volume: ' + volume);
                resolve(volume);
            } else {
                reject(result);
            }
        });
    });
}
_send(path, callback) {
    const req = http.request({
        host: this.address, port: 9032,
        path: path, method: 'POST'
    }, res => {
        res.setEncoding('utf8');
        res.on('data', chunk => {
            this.log.debug(`BODY: ${chunk}`);
            callback(false, chunk);
        });
        res.on('end', () => { });
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
async setOnHandler(value) {
    this.log.info('OnHandler state to:', value);
    let new_vol = value ? this.defaultVolume : 0;
    this._send(`/setVolume/${new_vol}`, (error, result) => {
        if (!error) {
            this.log.info('Request sent to set volume to ' + new_vol);
            this.vol = new_vol;
            this.updateUI();
        } else {
            this.bulb.updateCharacteristic(this.Characteristic.On, new Error(result));
        }
    });
}
async setBrightnessHandler(value) {
    if (value != 100) {
        this.log.info('BrightnessHandler state to:', value);
        this._send(`/setVolume/${value}`, (error, result) => {
            if (!error) {
                this.log.info('Request sent to set volume to ' + value);
                this.vol = value;
                this.updateUI();
            } else {
                this.bulb.updateCharacteristic(this.Characteristic.Brightness, new Error(result));
            }
        });
    }
}
updateUI() {
    setTimeout(() => {
        this.bulb.updateCharacteristic(this.Characteristic.On, this.vol > 0);
        this.bulb.updateCharacteristic(this.Characteristic.Brightness, this.vol);
    }, 100);
}
```

**Polling**

If an external non-homkit device changes the volume of speaker HW, homekit never knows. In this case, homekit UI and our plugin shall have wrong information. For this reason, I implemented a polling mechanism, which checks the volume of speaker HW per every 1 sec and update the UI.

```js
constructor(log, config, api) {
    // ... existing codes
    this.refreshInterval = typeof this.config.refreshInterval == 'number' ? this.config.refreshInterval : 1000;

    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
}

poll() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    // volume update from URRI
    this._send(`/getVolume`, (error, result) => {
        if (!error) {
            const volume = parseInt(result, 10);
            this.log.debug('Read from URRI; volume: ' + volume);
            this.vol = volume;
            this.updateUI();
        } else {
            this.bulb.updateCharacteristic(this.Characteristic.On, new Error(result));
            this.bulb.updateCharacteristic(this.Characteristic.Brightness, new Error(result));
        }
    });
    this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
}
```
