export default class Emitter {
    constructor() {
        this.subs = [];
    }

    on(name, cb) {
        this.subs[name] = this.subs[name] || [];
        this.subs[name].push(cb);
    }

    off(name, cb){
        if (!this.subs[name]) return;
        for (var i in this.subs[name]){
            if (this.subs[name][i] === cb){
                this.subs[name].splice(i);
                break;
            }
        }
    }

    emit(name){
        if (!this.subs[name]) return;
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i in this.subs[name]){
            this.subs[name][i].apply(this, args);
        }
    }
}
