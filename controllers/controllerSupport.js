const fs = require("fs");

// Root of the path to json data
const sourceFolder = "./DB_json";

/////////////////////////////////////////////////
// Function to dinamically read path to json data
const readSource = (currentFolder) => {
  const sourceFolders = fs.readdirSync(sourceFolder);
  if (!currentFolder) currentFolder = sourceFolders[sourceFolders.length - 1];
  const currentPath = `${sourceFolder}/${currentFolder}`;
  const readSource = {
    sourceFolders,
    currentPath,
    currentFolder,
  };
  return readSource;
};

/////////////////////////////////////////////////
// Function to read JSON data from file
const processJson = (filePath) => {
  try {
    const jsonData = fs.readFileSync(filePath, "utf8");
    return JSON.parse(jsonData);
  } catch (err) {
    console.error("Error reading JSON file:", err);
    return null;
  }
};

/////////////////////////////////////////////////
// Functions to analyse JSON data and produce a 'pivot'
function toPivot(inputJson) {
  // Function to count the number of matches between source and target
  function countMatches(json) {
    const matches = {};
    json.forEach((item) => {
      const source = item["calls.source"];
      const target = item["calls.target"];
      const key = `${source}_${target}`;
      matches[key] = (matches[key] || 0) + 1;
    });
    return matches;
  }

  // Function to transform the counts into desired output JSON format
  function transformToOutput(matches) {
    return Object.keys(matches)
      .map((key) => {
        const [source, target] = key.split("_");
        return {
          "Call ID": parseInt(source),
          "Used Dept": parseInt(target),
          match_count: matches[key],
        };
      })
      .sort((a, b) => a.source - b.source);
  }

  const matches = countMatches(inputJson);
  return transformToOutput(matches);
}

////////////////////////////////////////////////////////////
// Supporting functions
const renderProperties = (incomingReq, path) => {
  if (incomingReq === "home") {
    path += "/in.json";
    renderTitle = "Home";
    renderLabel = "Current Week Report";
  } else if (incomingReq === "annual") {
    path += "/in.json";
    renderTitle = "Annual";
    renderLabel = "Current Annual Report";
  } else if (incomingReq === "id") {
    path += "/in.json";
    renderTitle = "Radio ID";
    renderLabel = "Radio ID pairing";
  } else if (incomingReq === "sus") {
    path += "/sus.json";
    renderTitle = "Channels";
    renderLabel = "Channel Table Association";
  } else if (incomingReq === "eam") {
    path += "/dsp.json";
    renderTitle = "EAM";
    renderLabel = "EAM report";
  } else if (incomingReq === "ch") {
    path += "/ch.json";
    renderTitle = "Call DB";
    renderLabel = "Chronograf DB query";
  } else if (incomingReq === "port") {
    path += "/in.json";
    renderTitle = "Portable";
    renderLabel = "Portable Radio Compliance";
  } else {
    path += "/in.json";
    renderTitle = "Portable";
    renderLabel = "Compliance x Department";
  }
  return [path, renderTitle, renderLabel];
};

function insertDynamicAnchor(path, currentFolder, incomingReq, renderTitle) {
  currentFolder !== undefined && currentFolder !== ""
    ? (container = `<a href="/${path}/${currentFolder}/${incomingReq}"><button class="container header-btn">${renderTitle}</button></a>`)
    : (container = `<a href="/${path}${
        renderTitle === "Annual" ? "/" + renderTitle.toLowerCase() : ""
      }"><button class="container header-btn">${renderTitle}</button></a>`);
  return container;
}

////////////////////////////////////////////////////////////
const sourceManager = (req) => {
  // Managing source filepath and render properties
  const currentFolder = readSource(req.params.id).currentFolder;

  let incomingReq = req.url.split("/");
  incomingReq = incomingReq[incomingReq.length - 1];
  const [sourcePath, renderTitle, renderLabel] = renderProperties(
    incomingReq,
    readSource(req.params.id).currentPath
  );

  // Managing json data
  let jsonData = processJson(sourcePath);
  if (incomingReq === "ch") jsonData = toPivot(jsonData);
  const jsonKeys = Object.keys(jsonData[0]);
  return [renderTitle, renderLabel, currentFolder, jsonData, jsonKeys];
};

////////////////////////////////////////////////////////////
// Join arrays function
const joinArrays = (arr1, arr2, field) => {
  return arr1.map((obj1) => {
    const obj2 = arr2.find((item) => item[field] == obj1[field]);
    return { ...obj1, ...obj2 };
  });
};

// Group objects by 'Call ID'
const getMaxMatchCountObjects = (data) => {
  // Group objects by 'Call ID'
  const groupedData = data.reduce((acc, obj) => {
    const callId = obj["Call ID"];
    if (!acc[callId] || acc[callId].match_count < obj.match_count) {
      acc[callId] = obj;
    }
    return acc;
  }, {});

  // Convert grouped data back to array
  const result = Object.values(groupedData);
  return result;
};

// Modify data fields function
const updateData = (tempJsonData7, tempJsonData8) => {
  tempJsonData7.forEach((data7) => {
    tempJsonData8.forEach((data8) => {
      if (data7["Assigned Dept"] === data8["FC Channel Name"]) {
        data7["Assigned Dept"] = data8["Channel description"];
      }
      if (data7["Used Dept"] === data8["Call Number"]) {
        data7["Used Dept"] = data8["Channel description"];
      }
    });
  });
  return tempJsonData7;
};

// Adding Compliance field function
const addCompliantKey = (data) => {
  data.forEach((item) => {
    let compliant;
    if (item["Assigned Dept"] === "Lost") {
      compliant = "Lost";
    } else if (item["Assigned Dept"] === "Damaged") {
      compliant = "Damaged";
    } else if (item["Assigned Dept"] === "IT Spare") {
      compliant = "IT Spare";
    } else if (item["Assigned Dept"] == null || item["Used Dept"] == null) {
      compliant = "Unknown";
    } else if (item["Assigned Dept"] === item["Used Dept"]) {
      compliant = "Compliant";
    } else {
      compliant = "Not Compliant";
    }
    item.Status = compliant;
  });
};

// Creating Compliance Header function
const calculateStats = (data1, data2, req) => {
  const week = req.url.split("/")[2].substring(2);
  let assigned = 0;
  data1.forEach((item1) => {
    const assignedDept = item1["Assigned Dept"];
    data2.forEach((item2) => {
      const channelDescription = item2["Channel description"];
      if (
        assignedDept === channelDescription &&
        channelDescription !== "IT Spare" &&
        channelDescription !== "Damaged" &&
        channelDescription !== "Lost"
      ) {
        assigned++;
      }
    });
  });
  const used = data1.filter((item) => item["Used Dept"] !== undefined).length;
  const comp = data1.filter((item) => item["Status"] === "Compliant").length;
  const nonComp = data1.filter(
    (item) => item["Status"] === "Not Compliant"
  ).length;
  const total = data1.length;

  return [
    {
      Week: week,
      Assigned: assigned,
      Used: used,
      Compliant: comp,
      "Non Compliant": nonComp,
      Total: total,
    },
  ];
};

// Managing compliance data query
const queryManager = (req) => {
  const jsonData = [];

  // Recovering in.json data (default input json from renderProperties)
  const [renderTitle1, renderLabel1, currentFolder1, tempJsonData1, jsonKeys1] =
    sourceManager(req);

  // Recovering dsp.json data
  let incomingReq = req.url.split("/");
  incomingReq[incomingReq.length - 1] = "eam";
  req.url = incomingReq.join("/");
  const [renderTitle2, renderLabel2, currentFolder2, tempJsonData2, jsonKeys2] =
    sourceManager(req);

  // Recovering ch.json data
  incomingReq = req.url.split("/");
  incomingReq[incomingReq.length - 1] = "ch";
  req.url = incomingReq.join("/");
  const [renderTitle3, renderLabel3, currentFolder3, tempJsonData3, jsonKeys3] =
    sourceManager(req);

  // Joining source data as I need
  const tempJsonData4 = joinArrays(
    tempJsonData1,
    tempJsonData2,
    "Serial Number"
  );
  const tempJsonData5 = getMaxMatchCountObjects(tempJsonData3);
  const tempJsonData6 = joinArrays(tempJsonData4, tempJsonData5, "Call ID");

  // Creating Compliance Json
  const tempJsonData7 = tempJsonData6.map(
    ({ "Call ID": callId, Locator, "Used Dept": target }) => ({
      "Call ID": callId,
      "Assigned Dept": Locator,
      "Used Dept": target,
    })
  );

  // Recovering sus.json data
  incomingReq = req.url.split("/");
  incomingReq[incomingReq.length - 1] = "sus";
  req.url = incomingReq.join("/");
  const [renderTitle8, renderLabel8, currentFolder8, tempJsonData8, jsonKeys8] =
    sourceManager(req);

  // Modifying Assigned and Used names in Compliance table
  updateData(tempJsonData7, tempJsonData8);

  // Adding Compliance
  addCompliantKey(tempJsonData7);

  // Creating Compliance Header
  const header = calculateStats(tempJsonData7, tempJsonData8, req);

  // Filling the output array
  jsonData.push(header);
  jsonData.push(tempJsonData7);

  return jsonData;
};

// Managing compliance data query xDept
const queryManagerXDept = (req) => {
  const jsonData = queryManager(req);

  // Grouping function
  const groupedData = {};
  jsonData.forEach((array) => {
    array.forEach((obj) => {
      const assignedDept = obj["Assigned Dept"];
      if (!groupedData[assignedDept]) {
        groupedData[assignedDept] = [];
      }

      groupedData[assignedDept].push({
        "Call ID": obj["Call ID"],
        "Assigned Dept": assignedDept,
        "Used Dept": obj["Used Dept"],
        Status: obj.Status,
      });
    });
  });

  return Object.values(groupedData);
};

// Managing Annual data report
const annualReport = (req, sourceFolders) => {
  let annualData = [];
  let jsonData;
  let weekData;

  for (i = 0; i < 52; i++) {
    let y = (i + 1).toString().padStart(2, "0");

    if (sourceFolders.includes("wk" + y)) {
      req.url = `/compliance/wk${y}/port`;
      req.params.id = `wk${y}`;
      jsonData = queryManager(req);
      weekData = jsonData[0][0];
      annualData.push(weekData);
    } else {
      weekData = {
        Week: "wk" + y,
        Assigned: 0,
        Used: 0,
        Compliant: 0,
        "Non Compliant": 0,
        Total: 0,
      };
      annualData.push(weekData);
    }
  }

  return annualData;
};

// Function to return the maximum referiment for the annual chart construction
function maxUsed(annualData) {
  let myMaxUsed = 0;
  for (i = 0; i < annualData.length; i++) {
    annualData[i].Assigned > myMaxUsed
      ? (myMaxUsed = annualData[i].Assigned)
      : null;
    annualData[i].Used > myMaxUsed ? (myMaxUsed = annualData[i].Used) : null;
    annualData[i]["Non Compliant"] > myMaxUsed
      ? (myMaxUsed = annualData[i]["Non Compliant"])
      : null;
  }
  return myMaxUsed;
}

module.exports = {
  readSource,
  insertDynamicAnchor,
  sourceManager,
  queryManager,
  queryManagerXDept,
  annualReport,
  maxUsed,
};
