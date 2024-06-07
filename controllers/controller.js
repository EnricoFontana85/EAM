const {
  readSource,
  insertDynamicAnchor,
  sourceManager,
  queryManager,
  queryManagerXDept,
  annualReport,
  maxUsed,
} = require("./controllerSupport");

const sourceFolders = readSource().sourceFolders;

////////////////////////////////////////////////////////////
// Rendering
const home = (req, res) => {
  const [renderTitle, renderLabel, currentFolder, jsonKeys] =
    sourceManager(req);

  if (req.url.split("/")[req.url.split("/").length - 1] === "home") {
    // Data required to generate Current Week Report
    req.params.id = currentFolder;
    req.url = `/compliance/${currentFolder}/port`;
    const jsonData = queryManager(req);
    const weekData = jsonData[0][0];

    res.render("main", {
      renderTitle,
      renderLabel,
      sourceFolders,
      // Reset on current folder when visiting Home
      currentFolder: sourceFolders[sourceFolders.length - 1],
      weekData,
      dynamicAnchor: insertDynamicAnchor("home", "", "", "Weekly"),
      dynamicAnchor2: insertDynamicAnchor("home", "", "", "Annual"),
    });
  } else {
    // Data required to generate Current Annual Report
    const annualData = annualReport(req, sourceFolders);

    const myMaxUsed = maxUsed(annualData);

    res.render("annual", {
      renderTitle,
      renderLabel,
      sourceFolders,
      currentFolder,
      annualData,
      myMaxUsed,
      dynamicAnchor: insertDynamicAnchor("home", "", "", "Weekly"),
      dynamicAnchor2: insertDynamicAnchor("home", "", "", "Annual"),
    });
  }
};

const support = (req, res) => {
  const [renderTitle, renderLabel, currentFolder, jsonData, jsonKeys] =
    sourceManager(req);

  res.render("source", {
    renderTitle,
    renderLabel,
    sourceFolders,
    currentFolder,
    jsonData,
    jsonKeys,
    dynamicAnchor: insertDynamicAnchor(
      "support",
      currentFolder,
      "id",
      "Radio ID"
    ),
    dynamicAnchor2: insertDynamicAnchor(
      "support",
      currentFolder,
      "sus",
      "Channels"
    ),
  });
};

const compliance = (req, res) => {
  const [renderTitle, renderLabel, currentFolder, jsonKeys] =
    sourceManager(req);

  const jsonData =
    req.url.split("/")[3] === "port"
      ? queryManager(req)
      : queryManagerXDept(req);

  res.render("tables", {
    renderTitle,
    renderLabel,
    sourceFolders,
    currentFolder,
    jsonData,
    jsonKeys,
    dynamicAnchor: insertDynamicAnchor(
      "compliance",
      currentFolder,
      "port",
      "Compliance" //"Portable Compliance"
    ),
    dynamicAnchor2: insertDynamicAnchor(
      "compliance",
      currentFolder,
      "xdp",
      "xDept" //"xDept Portable Compliance"
    ),
  });
};

const source = (req, res) => {
  const [renderTitle, renderLabel, currentFolder, jsonData, jsonKeys] =
    sourceManager(req);

  res.render("source", {
    renderTitle,
    renderLabel,
    sourceFolders,
    currentFolder,
    jsonData,
    jsonKeys,
    dynamicAnchor: insertDynamicAnchor("source", currentFolder, "eam", "EAM"),
    dynamicAnchor2: insertDynamicAnchor(
      "source",
      currentFolder,
      "ch",
      "Call DB"
    ),
  });
};

module.exports = {
  home,
  support,
  compliance,
  source,
};
