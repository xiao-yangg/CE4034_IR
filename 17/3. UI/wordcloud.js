am5.ready(async function () {
  // Create root element
  // https://www.amcharts.com/docs/v5/getting-started/#Root_element
  var root = am5.Root.new("cloud");

  // Set themes
  // https://www.amcharts.com/docs/v5/concepts/themes/
  root.setThemes([am5themes_Animated.new(root)]);

  // Add series
  // https://www.amcharts.com/docs/v5/charts/word-cloud/
  var series = root.container.children.push(
    am5wc.WordCloud.new(root, {
      categoryField: "key",
      valueField: "value",
      maxFontSize: am5.percent(15)
    })
  );

  // Configure labels
  series.labels.template.setAll({
    fontFamily: "Courier New",
  });

  // Animation
  setInterval(function () {
    am5.array.each(series.dataItems, function (dataItem) {
      var value = Math.random() * 65;
      value = value - Math.random() * value;
      dataItem.set("value", value);
      dataItem.set("valueWorking", value);
    });
  }, 5000);

  let url = "http://localhost:8983/solr/reddit/select?indent=true&q.op=OR&q=*%3A*&useParams="; // to replace with the solr link
  
  var response = await fetch(url);
  var data = await response.json();
  var results = data.response.docs;

  var store = {};
  for (var i = 0; i < results.length; i += 1) {
    var res = String(results[i].text_clean_stopword).split(" ");
    for (var j = 0; j < res.length; j += 1) {
      if (store[res[j]] !== undefined) {
        store[res[j]] += 1;
      } else {
        store[res[j]] = 1;
      }
    }
  }
  console.log(store);

  var stopwords = new Set();
  stopwords.add('a')
  stopwords.add('and')
  stopwords.add('an')
  stopwords.add('are')
  stopwords.add('as')
  stopwords.add('and')
  stopwords.add('at')
  stopwords.add('be')
  stopwords.add('but')
  stopwords.add('by')
  stopwords.add('for')
  stopwords.add('if')
  stopwords.add('in')
  stopwords.add('into')
  stopwords.add('is')
  stopwords.add('it')
  stopwords.add('no')
  stopwords.add('not')
  stopwords.add('of')
  stopwords.add('on')
  stopwords.add('or')
  stopwords.add('such')
  stopwords.add('that')
  stopwords.add('the')
  stopwords.add('their')
  stopwords.add('then')
  stopwords.add('there')
  stopwords.add('these')
  stopwords.add('they')
  stopwords.add('this')
  stopwords.add('to')
  stopwords.add('was')
  stopwords.add('my')
  stopwords.add('who')

  for (const [key, value] of Object.entries(store)) {
    if (stopwords.has(key) === false && value > 1) {
      series.data.push({
              key: key,
              value: value
            });
    }
  }
  console.log(series.data);

});