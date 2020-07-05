/* Simple prototype for an Audiobook Player based on <audio> */
String.prototype.replaceAll = function (stringToFind, stringToReplace) {
  if (stringToFind === stringToReplace) return this;
  var temp = this;
  var index = temp.indexOf(stringToFind);
  while (index != -1) {
    temp = temp.replace(stringToFind, stringToReplace);
    index = temp.indexOf(stringToFind);
  }
  return temp;
};
(function () {
  var DEFAULT_MANIFEST = "manifest.json";
  var current_url_params = new URLSearchParams(location.href);

  if (current_url_params.has("href")) {
    console.log("Found manifest in params");
    var manifest_url = current_url_params.get("href");
  } else {
    current = window.location.href;
    current = current.replace("/index.html", "");
    current = current.replace("index.html", "");
    var manifest_url = current + "/" + DEFAULT_MANIFEST;
    console.log(manifest_url);
  }

  if (current_url_params.has("track")) {
    console.log("Found reference to a document in params");
    var track = current_url_params.get("track");
  } else {
    var track = undefined;
  }

  var audio = document.getElementById("audio-element");
  var audio_source = document.getElementById("audio-source");
  var cover = document.getElementById("cover");
  var next = document.getElementById("next");
  var previous = document.getElementById("previous");
  var ting = document.getElementById("current");

  var saved_track = localStorage.getItem(manifest_url + "#track");
  var saved_position = localStorage.getItem(manifest_url + "#t");
  if (saved_position && saved_track) {
    console.log(
      "Found previous position at: " + saved_track + "#t=" + saved_position
    );
    initializeNavigation(manifest_url, saved_track)
      .then(function () {
        audio.currentTime = saved_position;
      })
      .catch(function () {});
  } else {
    initializeNavigation(manifest_url, track).catch(function () {});
  }

  audio.addEventListener("timeupdate", function () {
    if (Math.round(audio.currentTime) % 10 == 1) {
      localStorage.setItem(manifest_url + "#t", audio.currentTime);
    }
  });

  audio.addEventListener("ended", function () {
    if (next.hasAttribute("href")) {
      updateTrack(manifest_url, next.href).then(function () {
        audio.play();
      });
    }
  });

  next.addEventListener("click", function (event) {
    if (next.hasAttribute("href")) {
      updateTrack(manifest_url, next.href).then(function () {
        audio.play();
      });
    }
    event.preventDefault();
  });

  previous.addEventListener("click", function (event) {
    if (previous.hasAttribute("href")) {
      updateTrack(manifest_url, previous.href).then(function () {
        audio.play();
      });
    }
    event.preventDefault();
  });

  function getManifest(url) {
    return fetch(url)
      .catch(function () {
        return caches.match(url);
      })
      .then(function (response) {
        return response.json();
      });
  }

  function initializeNavigation(url, track_url) {
    return getManifest(url)
      .then(function (json) {
        var title = json.metadata.title;
        console.log("Title of the publication: " + title);
        document.querySelector("title").textContent = title;

        //Search for cover and add it
        if (json.links) {
          json.links.forEach(function (link) {
            if (link.rel) {
              if (link.rel == "cover") {
                console.log("Found cover: " + link.href);
                // cover.src = new URL(link.href, url).href; // doesnt work coz default manifest is not a url
                cover.src = new URL(link.href).href;
              }
            }
          }, this);
        }

        return json.readingOrder;
      })
      .then(function (readingOrder) {
        //Set start track
        var start_url = new URL(readingOrder[0].href, url).href;

        if (track_url) {
          updateTrack(url, track_url);
        } else {
          updateTrack(url, start_url);
        }
      });
  }

  function updateTrack(url, current) {
    console.log("Getting " + url);
    if (current) {
      var current_src = current;
    } else {
      var current_src = audio_source.src;
    }
    return getManifest(url)
      .then(function (json) {
        return json.readingOrder;
      })
      .then(function (readingOrder) {
        var current_index = readingOrder.findIndex(function (element) {
          var element_url = new URL(element.href, url);
          return element_url.href == current_src;
        });
        temp = readingOrder[current_index].href;
        temp = temp.substring(5, temp.length - 4);
        temp = temp.replaceAll("_", " ");
        ting.innerHTML = temp;
        if (current_index >= 0) {
          audio_source.src = new URL(
            readingOrder[current_index].href,
            url
          ).href;
          localStorage.setItem(url + "#track", audio_source.src);
          audio_source.type = readingOrder[current_index].type;
          audio.load();

          if (current_index > 0) {
            console.log(
              "Previous track is: " + readingOrder[current_index - 1].href
            );
            previous.href = new URL(
              readingOrder[current_index - 1].href,
              url
            ).href;
          } else {
            previous.removeAttribute("href");
          }

          if (current_index < readingOrder.length - 1) {
            console.log(
              "Next track is: " + readingOrder[current_index + 1].href
            );
            next.href = new URL(readingOrder[current_index + 1].href, url).href;
          } else {
            next.removeAttribute("href");
          }
        }
      });
  }
})();
