class RedisMock {
    constructor() {
        this.cache = new Map();
    }

    async connect() {
        console.log('RedisMock connected (In-Memory).');
        return true;
    }

    async set(key, value, options) {
        this.cache.set(key, value);
        if (options && options.EX) {
            setTimeout(() => this.cache.delete(key), options.EX * 1000);
        }
        return 'OK';
    }

    async get(key) {
        return this.cache.get(key) || null;
    }

    async del(key) {
        this.cache.delete(key);
        return 1;
    }

    async flushdb() {
        this.cache.clear();
        return 'OK';
    }
}

module.exports = new RedisMock();
