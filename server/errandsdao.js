const mysqlConn = require("./mysqlhelper");

const errandDao = {

    getAllErrands(cb){
        mysqlConn.query("select * from errands", (error, data) => {
            cb(error, data);
        });
    },

    createNewErrand(errand,cb){
        mysqlConn.query("insert into errands set ?", errand, (error, data) => {
            cb(error, data);
        });
    },

    getErrandById(id,cb){
        mysqlConn.query("select * from errands where id = ?", id, (error, data) => {
            cb(error, data);
        });
    },

    updateToRunningMode(errand, runner, fee, cb){
        mysqlConn.query("update errands set runner = ?, fee = ? where id = ? ", [runner, fee, errand], (error, data) => {
            cb(error, data);
        });
    },

    getErrandsIPost(id, cb){
        mysqlConn.query("select * from errands where poster = ?", id, (error, data) => {
            cb(error, data);
        });
    },

    getErrandsIRun(id, cb){
        mysqlConn.query("select * from errands where runner = ?", id, (error, data) => {
            cb(error, data);
        });
    },
}

module.exports = errandDao;