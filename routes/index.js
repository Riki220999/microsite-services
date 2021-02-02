const express = require("express");
const couchbase = require("couchbase");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
var router = express.Router();
const moment = require("moment");
require("moment-precise-range-plugin");
const jwt = require("jsonwebtoken");
// const auth = require("../middleware/auth");
const loginBase = require("../middleware/loginBase");
const path = require("path");
var LocalStorage = require("node-localstorage").LocalStorage,
  localStorage = new LocalStorage("./scratch");

let envBuild = process.env.ENV_BUILD || "PROD";
console.log(envBuild);

let environment = {
  UAT: {
    url: "http://10.171.213.120:8091",
    // url: "http://10.171.212.125:8091",
    username: "Administrator",
    password: "R4hasia",
    // password: "prud1g1-d3v",
    bucketName: "HothouseData",
    // bucketName: "test",
    baseUrlAPI: "https://docker-uat.pru.intranet.asia",
    baseUrlEmail: "http://10.170.49.214",
  },
  PROD: {
    url: "http://10.171.84.167:8091",
    username: "Administrator",
    password: "R4hasia",
    bucketName: "HothouseData",
    baseUrlAPI: "https://pruforce-docker.pru.intranet.asia",
    baseUrlEmail: "https://microservices.pru.intranet.asia",
  },
};

console.log(environment[envBuild]);

var cluster = new couchbase.Cluster(environment[envBuild].url, {
  username: environment[envBuild].username,
  password: environment[envBuild].password,
});
var bucket = cluster.bucket(environment[envBuild].bucketName);
var collection = bucket.defaultCollection();

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString("base64");
}

// localStorage.setItem(
//   "flyerAttachment",
//   base64_encode(path.resolve(__dirname, "../resource/flyerAttachment.png"))
// );

router.use(cors({ origin: "*" }));

/* GET home page. */
router.get("/", function (req, res, next) {
  res.sendFile(path.join(__dirname + "../views"));
});

router.post("/login", function (httprequest, httpresponse, next) {
  let paramBody = httprequest.body;
  //check userid
  if (
    paramBody.userId === "administrator" &&
    paramBody.password === "digitalpatnership"
  ) {
    const token = jwt.sign({ _id: paramBody.userId }, "hothousemyleads", {
      expiresIn: 60000000,
    });
    httpresponse.status(200);
    httpresponse.json({ success: true, token: token });

    localStorage.setItem(paramBody.userId, token);
  } else {
    httpresponse.status(200);
    httpresponse.json({ success: false, message: "Invalid Credentials" });
  }
});
async function getSumPatner(httprequest, httpresponse) {
  try {
    let paramBody = httprequest.body;
    let paramType = "client";
    let paramClient = {
      patnerName: paramBody.patnerName,
    };
    var result = await cluster.query(
      "SELECT count(*) FROM `" +
        environment[envBuild].bucketName +
        "` data WHERE channel=$1 and type_ = $2",
      { parameters: [paramClient.patnerName, "client"] }
    );
    httpresponse.status(200);
    httpresponse.json({ success: true, res: result.rows });
  } catch (e) {
    console.log("this Error", e);
    httpresponse.status(500);
    httpresponse.json({ success: false, message: e });
  }
}

router.post("/getSumPatner", async (httprequest, httpresponse) => {
  getSumPatner(httprequest, httpresponse);
});

async function addPatnership(httprequest, httpresponse) {
  let paramBody = httprequest.body;

  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = String(today.getFullYear());
  let h = String(today.getHours()).padStart(2, "0");
  let m = String(today.getMinutes()).padStart(2, "0");
  let s = String(today.getSeconds()).padStart(2, "0");
  let keytodayString = yyyy
    .concat(mm)
    .concat(dd)
    .concat(":")
    .concat(h)
    .concat(m)
    .concat(s);
  let todayString = yyyy + "-" + mm + "-" + dd + " " + h + ":" + m + ":" + s;

  var policyHolderVal = paramBody.policyHolder.match(/^[a-zA-Z. ]+$/g)
    ? paramBody.policyHolder
    : false;
  var StartDateVal = moment(paramBody.startDate, "MM/DD/YYYY", true).isValid()
    ? paramBody.startDate
    : false;
  var EndDateVal = moment(paramBody.endDate, "MM/DD/YYYY", true).isValid()
    ? paramBody.endDate
    : false;
  var HPVal = paramBody.phoneNo.match(
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,}$/im
  )
    ? paramBody.phoneNo
    : false;
  var idNoVal = paramBody.idNo.match(/^\d+$/g) ? paramBody.idNo : false;
  var beneficiaryVal = paramBody.beneficiary.match(/^[a-zA-Z. ]+$/g)
    ? paramBody.beneficiary
    : false;
  var emailVal = paramBody.email.match(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  )
    ? paramBody.email
    : false;
  var DOBVal = moment(paramBody.policyHolderDOB, "YYYY-MM-DD", true).isValid()
    ? paramBody.policyHolderDOB
    : false;
  var ChannelVal = paramBody.channel.match(/^[a-zA-Z. ]+$/g)
    ? paramBody.channel
    : false;

  //start insert
  let document = {
    startDate: StartDateVal,
    endDate: EndDateVal,
    phoneNo: HPVal,
    policyHolder: policyHolderVal,
    email: emailVal,
    policyHolderDOB: DOBVal,
    idNo: idNoVal,
    dateLeadsComing: todayString,
    channel: ChannelVal,
    beneficiary: beneficiaryVal,
    type_: "client",
  };

  let status;
  let json;

  if (document.policyHolder.length >= 26) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input PolicyHolder 25 characters",
      },
    };
  } else if (document.policyHolder === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid PolicyHolder input",
      },
    };
  } else if (document.startDate.length >= 12) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Start Date 11 digit",
      },
    };
  } else if (document.startDate === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid format date (mm/dd/yyyy)",
      },
    };
  } else if (document.endDate.length >= 12) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input End Date 11 digit",
      },
    };
  } else if (document.endDate === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid format date (mm/dd/yyyy)",
      },
    };
  } else if (document.policyHolderDOB.length >= 12) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Policy Holder DOB 11 digit",
      },
    };
  } else if (document.policyHolderDOB === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid format date (yyyy-mm-dd)",
      },
    };
  } else if (document.channel.length >= 26) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Channel 25 characters",
      },
    };
  } else if (document.channel === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid Channel format",
      },
    };
  } else if (document.beneficiary.length >= 26) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Beneficiary 25 character",
      },
    };
  } else if (document.beneficiary === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid Beneficiary input",
      },
    };
    // httpresponse.json();
  } else if (document.phoneNo.length >= 16) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Phone number 15 digit",
      },
    };
  } else if (document.phoneNo === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid HP input",
      },
    };
  } else if (document.idNo.length >= 17) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input KTP ID 16 digit",
      },
    };
  } else if (document.idNo === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid KTP ID input",
      },
    };
  } else if (document.beneficiary.length >= 26) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Beneficiary 25 character",
      },
    };
  } else if (document.beneficiary === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid Beneficiary input",
      },
    };
    // httpresponse.json();
  } else if (document.email === false) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "invalid email input",
      },
    };
  } else if (document.email.length >= 255) {
    status = 400;
    json = {
      error: {
        id_err: "error::".concat(keytodayString),
        message: "Maximum Input Email 254 characters",
      },
    };
  } else {
    try {
      let prefixDoc = "pru::leads::partnership::"
        .concat(keytodayString)
        .concat(getRandomInt(1000));
      console.log("🚀prefixDoc", prefixDoc);
      var result = await collection.insert(
        prefixDoc,
        document,
        function (err, result) {
          if (!err) {
            console.log("stored document successfully. CAS is %j", result.cas);
          } else {
            console.error("Couldn't store document: %j", err);
          }
        }
      );

      httpresponse.status(200);
      httpresponse.json({ idDoc: prefixDoc, success: true });
    } catch (e) {
      console.log("this Error", e);
      httpresponse.status(500);
      httpresponse.json({ success: false, message: e });
    }
  }
  httpresponse.status(status);
  httpresponse.json(json);
}

async function addPatnershipBase(httprequest, httpresponse) {
  try {
    let paramBody = httprequest.body;

    let document = {
      startDate: paramBody.startDate,
      endDate: paramBody.endDate,
      phoneNo: paramBody.phoneNo,
      policyHolder: paramBody.policyHolder,
      email: paramBody.email,
      policyHolderDOB: paramBody.policyHolderDOB,
      idNo: paramBody.idNo,
      // dateLeadsComing: todayString,
      channel: paramBody.channel,
      beneficiary: paramBody.beneficiary,
      // type_: "client",
    };
    console.log("🚀document", document)

    const token = `Bearer ${localStorage.getItem("token_acc")}`;
    // console.log("🚀token", token);
    var configProxy = {
      method: "post",
      proxy: {
        host: "10.171.202.5",
        port: 8080,
      },
      url: "https://services-uat.prudential.co.id/base/proxy",
      headers: {
        "x-requested-url":
          "/flink/zuul/digitalpartnership-microsite-service/addPartnership",
        Authorization: token,
        "Content-Type": "application/json",
      },
      data: document,
    };
    axios(configProxy)
      .then(function (response) {
        console.log("prox", JSON.stringify(response.data));
        httpresponse.status(200);
        httpresponse.json(response.data);
        // console.log("res", response);
      })
      .catch(function (error) {
        console.log("~ error", error)
        httpresponse.status(500);
        httpresponse.json({ success: false, message: error.message });
      });
  } catch (e) {
    console.log("this Error", e);
    httpresponse.status(500);
    httpresponse.json({ success: false, message: e });
  }
}

router.post("/addPartnership", async (httprequest, httpresponse) => {
  addPatnership(httprequest, httpresponse);
});

router.post("/addPartnershipBase", loginBase, async (httprequest, httpresponse) => {
	addPatnershipBase(httprequest, httpresponse);
});

module.exports = router;
