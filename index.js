"use strict";
const http = require('http');

module.exports = function (homebridge) {

    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-tutorial", "URRI Volume", volume);

    function volume(log, config, api) {
        this.log = log;
        this.config = config;
        this.homebridge = api;
        this.vol = 0;

        this.defaultVolume = typeof this.config.defaultVolume == 'number' ? this.config.defaultVolume : 10;
        this.address = typeof this.config.address == 'string' ? this.config.address : 'localhost';
        this.refreshInterval = typeof this.config.refreshInterval == 'number' ? this.config.refreshInterval : 1000;

        this.log(`Volume accessory ${this.config.name} is Created!`);
        this.log(`${this.config.name} defaultVolume is ${this.defaultVolume}`);
        this.bulb = new Service.Lightbulb(this.config.name);
        // Set up Event Handler for bulb on/off
        this.bulb.getCharacteristic(Characteristic.On)
            .on("get", this.getPower.bind(this))
            .on("set", this.setPower.bind(this));
        this.bulb.getCharacteristic(Characteristic.Brightness)
            .on("get", this.getVolume.bind(this))
            .on("set", this.setVolume.bind(this));

        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);

        this.log('all event handler was setup.')
    };

    volume.prototype = {
        getServices: function () {
            if (!this.bulb) return [];
            this.log('Homekit asked to report service');
            const infoService = new Service.AccessoryInformation();
            infoService.setCharacteristic(Characteristic.Manufacturer, 'URRI');
            return [infoService, this.bulb];
        },
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
        poll: function () {
            if (this.timer) clearTimeout(this.timer);
            this.timer = null;

            // volume update from URRI
            this.getPower((err, poweron) => {  //this.vol updated.
                // update UI
                this.updateUI();
            });

            this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);
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
    }
};
