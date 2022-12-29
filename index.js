"use strict";
const http = require('http');

module.exports = (api) => {
    api.registerAccessory("URRI Volume", UrriVolumePlugin);
}

class UrriVolumePlugin {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.vol = 0;
        this.defaultVolume = typeof this.config.defaultVolume == 'number' ? this.config.defaultVolume : 10;
        this.address = typeof this.config.address == 'string' ? this.config.address : 'localhost';
        this.refreshInterval = typeof this.config.refreshInterval == 'number' ? this.config.refreshInterval : 1000;

        this.log.info(`Volume accessory ${this.config.name} is Created!`);
        this.log.info(`${this.config.name} defaultVolume is ${this.defaultVolume}`);

        this.infoService = new this.Service.AccessoryInformation()
            .setCharacteristic(this.Characteristic.Manufacturer, "URRI")
            .setCharacteristic(this.Characteristic.Model, "URRI receiver Volume control");

        this.bulb = new this.Service.Lightbulb(this.config.name);
        // Set up Event Handler for bulb on/off
        this.bulb.getCharacteristic(this.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))
            .onSet(this.setOnHandler.bind(this));
        this.bulb.getCharacteristic(this.Characteristic.Brightness)
            .onGet(this.getBrightnessHandler.bind(this))
            .onSet(this.setBrightnessHandler.bind(this));

        this.timer = setTimeout(this.poll.bind(this), this.refreshInterval);

        this.log.info('all event handler was setup.');
    }

    getServices() {
        return [this.infoService, this.bulb];
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

    async getBrightnessHandler() {
        this.log.debug('Homekit Asked Brightness State');
        return this.vol;
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
}
