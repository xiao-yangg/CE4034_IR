function searchQuery() {
  document.getElementById("result-container").style.display = "block";

  let url =
    "http://localhost:8983/solr/reddit/select?indent=true&useParams=&q.op=OR&debug.explain.structured=true&debugQuery=true&spellcheck.build=true&spellcheck=true"; // to replace with the solr link
  let url1 = "&q=text_clean%3A";
  let url2 = "&fq=category%3A";
  let url3 = "&fq=final_label%3A";

  //Basic Query
  let query = document.getElementById("userSearchQuery").value;
  let queryField = document.getElementById("dropdownChoice1").innerHTML;
  let queryFilter = document.getElementById("dropdownChoice2").innerHTML;

  let hasQuery = false;
  if (query !== "") {
    url = url + url1 + query;
    hasQuery = true;
  } else {
    url = url + "&q=*%3A*";
  }

  if (
    queryMatch(queryField, "COMMENT") ||
    queryMatch(queryField, "POST")
  ) {
    url = url + url2 + queryField;
  }
  if (
    queryMatch(queryFilter, "POSITIVE") ||
    queryMatch(queryFilter, "NEGATIVE") ||
    queryMatch(queryFilter, "NEUTRAL")
  ) {
    url = url + url3 + queryFilter;
  }

  //Re-Rank Query
  let rerank = document.getElementById("flexCheckDefault").checked;
  let weight = document.getElementById("dropdownChoice3").innerHTML;
  let terms = document.getElementById("rerankQuery").value;
  if (rerank && (queryMatch(weight, "2") || queryMatch(weight, "3") || queryMatch(weight, "4")) && terms !== "") {
    var termsArray = terms.split(",");
    var termsConcat = "";
    for (let i = 0; i < termsArray.length; i++) {
      termsConcat = termsConcat + "+" + termsArray[i];
    }
    url = url + "&rq={!rerank reRankQuery=$rqq reRankDocs=1000 reRankWeight=" + weight + "}&rqq=(" + termsConcat + ")"
  }

  if (document.getElementById("flexCheckDefault2").checked) {
    url = url + "&fq=dataset%3Atest" + "&rows=1000";
  } else {
    url = url + "&rows=100"
  }

  console.log(url);

  var resultTitleText = document.getElementById("resultTitleText");
  resultTitleText.innerHTML = "";
  var resultStatsText = document.getElementById("resultStatsText");
  resultStatsText.innerHTML = "";
  var resultContent = document.getElementById("resultContent");
  resultContent.innerHTML = "";
  var chartContainer = document.getElementById("chartContainer");
  chartContainer.innerHTML = "";
  var chartContainer2 = document.getElementById("chartContainer2");
  chartContainer2.innerHTML = "";
  var chartContainer3 = document.getElementById("chartContainer3");
  chartContainer3.innerHTML = "";

  fetchData(url, rerank, hasQuery);
}

async function fetchData(url, rerank, hasQuery) {
  //Emptying the current results, incase of re-query
  var response = await fetch(url);
  var data = await response.json();
  var noOfDocs = data.response.numFound;
  var myData = data.response.docs;
  var debugData = data.debug.explain;

  // var preparationTime = data.debug.timing.prepare.query.time;
  // var processingTime = data.debug.timing.process.query.time;
  var querySpeed = data.debug.timing.time;

  console.log(data.response);
  console.log(data.spellcheck);
  console.log(data.debug);

  //Results Title
  resultTitleText.innerHTML = "Displaying Top " + data.response.docs.length + " Search Results";
  resultTitleText.style.textAlign = "center";

  //Result Stats
  resultStatsText.innerHTML =
    noOfDocs + " Docs found in " + querySpeed + " milliseconds!"; //The (preparationTime + processingTime) can also be used here
  resultStatsText.style.textAlign = "center";

  //Load Result
  if (hasQuery === false) { // default
    document.getElementById("chartsContainer").style.display = "block";
    document.getElementById("resultContent").style.display = "block";
    document.getElementById("suggestionContent").style.display = "none";
    displayCharts(myData, debugData, rerank);
  } else {
    if (data.spellcheck.suggestion !== undefined) { // spellcheck
      document.getElementById("chartsContainer").style.display = "none";
      document.getElementById("resultContent").style.display = "none";
      document.getElementById("suggestionContent").style.display = "block";
      displaySuggestions(false, data.spellcheck.suggestions[1].suggestion);
    } else if (noOfDocs === 0) { // no results
      document.getElementById("chartsContainer").style.display = "none";
      document.getElementById("resultContent").style.display = "none";
      document.getElementById("suggestionContent").style.display = "block";
      displaySuggestions(true);
    } else { // show results
      document.getElementById("chartsContainer").style.display = "block";
      document.getElementById("resultContent").style.display = "block";
      document.getElementById("suggestionContent").style.display = "none";
      displayCharts(myData, debugData, rerank);
    }
  }
}

function displaySuggestions(noSuggest, sData=[]) {
  const suggest = document.getElementById("suggestionContent");
  suggest.innerHTML = "";

  var did = document.createElement("h7");
  if (noSuggest) {
    did.innerHTML = "<i>Try another query!</i>";
    did.style.color = "black";
    suggest.appendChild(did);
    return;
  }

  did.innerHTML = "<i>Did you mean:</i>";
  did.style.color = "black";
  suggest.appendChild(did);

  for (let i in sData) {
    const newSuggestion = document.createElement("button");
    newSuggestion.innerHTML = sData[i];
    newSuggestion.style.color = "black";
    newSuggestion.style.textAlign = "center";
    newSuggestion.style.margin = "5px";
    newSuggestion.style.borderRadius = "5px";
    newSuggestion.onclick = function () {
      updateInput(newSuggestion.innerHTML);
    };
    suggest.appendChild(newSuggestion);
  }
}

function displayCharts(myData, debugData, rerank) {
  //Extract relevant results
  let displayColumns = [
    "category",
    "subreddit",
    "author",
    "created_date",
    "score",
    "text_clean",
    "final_label",
  ];

  let categoryDict = {};
  let subredditDict = {};
  let finalLabelDict = {};

  for (var i = 0; i < myData.length; i++) {
    for (var j = 0; j < displayColumns.length; j++) {
      if (myData[i][displayColumns[j]] !== undefined) {
        myData[i][displayColumns[j]] = myData[i][displayColumns[j]][0];
        if (displayColumns[j] === "category") {
          addToDict(categoryDict, myData[i][displayColumns[j]]);
        } else if (displayColumns[j] === "subreddit") {
          addToDict(subredditDict, myData[i][displayColumns[j]]);
        } else if (displayColumns[j] === "final_label") {
          addToDict(finalLabelDict, myData[i][displayColumns[j]]);
        }
      } else {
        myData[i][displayColumns[j]] = "Unknown";
      }
    }

    let id = myData[i]["id"];
    if (id in debugData) {
      debug = debugData[id];
      if (rerank === false) {
        myData[i]["value"] = debug.value;
        if (debug.details !== undefined) {
            myData[i]["tf_value"] = debug.details[0].details[1].value;
            myData[i]["idf_value"] = debug.details[0].details[0].value;
        } else {
          myData[i]["tf_value"] = 1;
          myData[i]["idf_value"] = 1;
        }
      } else {
        console.log(debug.details)
        if (debug.details[1].match) { // bug
          myData[i]["value"] = debug.details[1].value;
          myData[i]["tf_value"] = debug.details[1].details[0].details[0].details[1].value;
          myData[i]["idf_value"] = debug.details[1].details[0].details[0].details[0].value;
        } else {
          myData[i]["value"] = 0;
          myData[i]["tf_value"] = 0;
          myData[i]["idf_value"] = 0;
        }
      }
    }
  }

  console.log(myData);
  console.log(categoryDict);
  console.log(subredditDict);
  console.log(finalLabelDict);

  var cols = Object.keys(myData[0]);
  console.log(cols);

  //Creating the Base Table
  var table = document.createElement("table");
  table.classList.add("table");

  //Creating Headers
  var tr = table.insertRow(-1); //Table Row
  for (var i = 0; i < cols.length; i++) {
    var th = document.createElement("th"); //Table Header
    th.innerHTML = cols[i];
    th.style.textAlign = "center";
    tr.appendChild(th);
  }

  //Adding Rows
  for (var i = 0; i < myData.length; i++) {
    tr = table.insertRow(-1);
    for (var j = 0; j < cols.length; j++) {
      var tabCell = tr.insertCell(-1);
      tabCell.innerHTML = myData[i][cols[j]];
    }
  }

  //Result Chart
  // set the data
  var cdata = [
    { x: "Neutral", value: finalLabelDict["NEUTRAL"] },
    { x: "Negative", value: finalLabelDict["NEGATIVE"] },
    { x: "Positive", value: finalLabelDict["POSITIVE"] },
  ];

  // create the chart
  var chart = anychart.pie();
  chart.title("Sentiment Chart");
  chart.innerRadius("30%");
  chart.data(cdata); // add the data
  chart.legend().itemsLayout("horizontal"); //set items layout
  chart.legend().fontSize(10);
  chart.legend().fontWeight(600);
  chart.container("chartContainer"); // display the chart in the container
  chart.draw();

  var c2Data = [
    { x: "Comment", value: categoryDict["comment"] },
    { x: "Post", value: categoryDict["post"] },
  ];

  var chart2 = anychart.pie();
  chart2.title("Category Chart");
  chart2.data(c2Data);
  chart2.legend().itemsLayout("horizontal");
  chart2.legend().fontSize(10);
  chart2.legend().fontWeight(600);
  chart2.container("chartContainer2");
  chart2.draw();

  var c3Data = [];
  Object.keys(subredditDict).forEach(function (key) {
    c3Data.push([key, subredditDict[key]]);
  });

  var chart3 = anychart.bar();
  chart3.title("Subreddit Chart");
  chart3.data(c3Data);
  chart3.container("chartContainer3");
  chart3.draw();

  //Result Content
  for (var i = 1; i < table.rows.length; i++) {
    var row = table.rows[i].getElementsByTagName("td");

    var outerCard = document.createElement("div");
    outerCard.className = "card mx-3 my-3";

    var body = document.createElement("div");
    body.className = "card-body";
    var title = document.createElement("h5");
    title.className = "card-title";
    title.innerHTML = row[2].innerHTML + " (<i>@" + row[3].innerHTML + "</i>)";
    var text = document.createElement("div");
    text.className = "card-text";
    text.innerHTML = row[7].innerHTML;

    var aRow = document.createElement("div");
    aRow.className = "d-flex flex-row justify-content-between my-2";
    var cat = document.createElement("div");
    cat.innerHTML = "<b>Category: </b>" + row[1].innerHTML;
    var date = document.createElement("div");
    date.innerHTML = "<b>Date Created: </b> " + row[4].innerHTML;

    var bRow = document.createElement("div");
    bRow.className = "d-flex flex-row justify-content-between my-2";
    var score = document.createElement("div");
    score.innerHTML = "<b>Reddit Score: </b>" + row[5].innerHTML;
    var senti = document.createElement("div");
    senti.innerHTML = "<b>Sentiment: </b> " + row[11].innerHTML;

    var cRow = document.createElement("div");
    cRow.className = "d-flex flex-row justify-content-between my-2";
    var tf_val = document.createElement("div");
    tf_val.innerHTML = "<b>TF Value: </b>" + row[cols.length-2].innerHTML;
    var idf_val = document.createElement("div");
    idf_val.innerHTML = "<b>IDF Value: </b> " + row[cols.length-1].innerHTML;
    var tf_idf_val = document.createElement("div");
    tf_idf_val.innerHTML = "<b>TF-IDF Value: </b> " + row[cols.length-3].innerHTML;

    aRow.append(cat);
    aRow.append(date);
    bRow.append(score);
    bRow.append(senti);
    cRow.append(tf_val);
    cRow.append(idf_val);
    cRow.append(tf_idf_val);
    body.append(title);
    body.append(text);
    body.append(aRow);
    body.append(bRow);
    body.append(cRow);
    outerCard.appendChild(body);
    // outerCard.appendChild(table);

    if (document.getElementById("flexCheckDefault2").checked && row[0].innerHTML === "test") {
      
      var resTable = document.createElement("table");
      resTable.className = "table table-bordered table-dark";

      var resTableHeaderRow = resTable.insertRow(-1);
      var resTableCols = ["NB","SVM","XGBoost","Stacked","BERT"];
      for (var x = 0; x < resTableCols.length; x++) {
        var th = document.createElement("th");
        th.innerHTML = resTableCols[x];
        th.style.textAlign = "center";
        resTableHeaderRow.appendChild(th);
      }

      var resTableDataRow = resTable.insertRow(-1);
      for (var y = 0; y < resTableCols.length; y++) {
        var tabCell = resTableDataRow.insertCell(-1);
        tabCell.innerHTML = row[13+y].innerHTML;
      }

      outerCard.appendChild(resTable);
    }

    if (row[11].innerText == "POSITIVE") {
      outerCard.style.backgroundColor = "lightgreen";
    } else if (row[11].innerText == "NEUTRAL") {
      outerCard.style.backgroundColor = "lightgoldenrodyellow";
    } else {
      outerCard.style.backgroundColor = "lightsalmon";
    }
    resultContent.appendChild(outerCard);
  } //Creating a card for each result
}

function queryMatch(q, target) {
  return q.trim() === target;
}

function updateInput(suggestion) {
  document.getElementById("userSearchQuery").value = suggestion;
}

function addToDict(dict, key) {
  if (key in dict) {
    dict[key] += 1;
  } else {
    dict[key] = 1;
  }
}

function setChoice1(item) {
  document.getElementById("dropdownChoice1").innerHTML = String(
    item.value
  ).toUpperCase();
}

function setChoice2(item) {
  document.getElementById("dropdownChoice2").innerHTML = String(
    item.value
  ).toUpperCase();
}

function setChoice3(item) {
  document.getElementById("dropdownChoice3").innerHTML = String(
    item.value
  );
}

function changeDisable() {
  document.getElementById("dropdownChoice3").disabled = !document.getElementById("dropdownChoice3").disabled;
  document.getElementById("rerankQuery").disabled = !document.getElementById("rerankQuery").disabled;
}

function resetField() {
  document.getElementById("userSearchQuery").value = "";
  document.getElementById("dropdownChoice1").innerHTML = "Category";
  document.getElementById("dropdownChoice2").innerHTML = "Sentiment";

  document.getElementById("rerankQuery").value = "";
  document.getElementById("dropdownChoice3").innerHTML = "Weight";
  document.getElementById("flexCheckDefault").checked = false;
  document.getElementById("dropdownChoice3").disabled = true;
  document.getElementById("rerankQuery").disabled = true;
}