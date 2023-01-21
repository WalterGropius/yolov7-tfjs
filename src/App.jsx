import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import { Webcam } from "./utils/webcam";
import { renderBoxes } from "./utils/renderBox";
import "./style/App.css";

/**
 * Function to detect image.
 * @param {HTMLCanvasElement} canvasRef canvas reference
 */

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcam = new Webcam();
  // configs
  const modelName = "yolov7";
  const threshold = 0.80;
  /**
   * Function to detect every frame loaded from webcam in video tag.
   * @param {tf.GraphModel} model loaded YOLOv7 tensorflow.js model
   */

  const detectFrame = async (model) => {
    const model_dim = [640, 640];
    tf.engine().startScope();
    const input = tf.tidy(() => {
      const img = tf.image
                  .resizeBilinear(tf.browser.fromPixels(videoRef.current), model_dim)
                  .div(255.0)
                  .transpose([2, 0, 1])
                  .expandDims(0);
      return img
    });

    await model.executeAsync(input).then((res) => {

      res = res.arraySync()[0];
      //Filtering only detections > conf_thres
      const conf_thres = 0.25;
      res = res.filter(dataRow => dataRow[4]>=conf_thres);

      var boxes = [];
      var class_detect = [];
      var scores = [];
      res.forEach(process_pred);

      function process_pred(res){
        var box = res.slice(0,4);

        //non_max_suppression
        const cls_detections = res.slice(5, 85);
        var max_score_index = cls_detections.reduce((imax, x, i, arr) => x > arr[imax] ? i : imax, 0);
        const search_index = class_detect.indexOf(max_score_index);
        if (search_index != -1){
          if(scores[search_index] < res[max_score_index + 5]){
            boxes[search_index] = box;
            scores[search_index] = res[max_score_index + 5];
          }
        }
        else{
          boxes.push(box)
          class_detect.push(max_score_index);
          scores.push(res[max_score_index + 5]);
        }
      }
      renderBoxes(canvasRef, threshold, boxes, scores, class_detect);
      tf.dispose(res);
    });

    requestAnimationFrame(() => detectFrame(model)); // get another frame
    tf.engine().endScope();
  };

  useEffect(() => {
    tf.loadGraphModel(`${window.location.origin}/${modelName}_web_model/model.json`, {
      onProgress: (fractions) => {
        setLoading({ loading: true, progress: fractions });
      },
    }).then(async (yolov7) => {
      // Warmup the model before using real data.
      const dummyInput = tf.ones(yolov7.inputs[0].shape);
      await yolov7.executeAsync(dummyInput).then((warmupResult) => {
        tf.dispose(warmupResult);
        tf.dispose(dummyInput);

        setLoading({ loading: false, progress: 1 });
        webcam.open(videoRef, () => detectFrame(yolov7));
      });
    });
  }, []);
  console.warn = () => {};

  return (
    <div className="App">
      <h2>Object Detection Using YOLOv7 & Tensorflow.js</h2>
      {loading.loading ? (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      ) : (
        <p> </p>
      )}

      <div className="content">
        <video autoPlay playsInline muted ref={videoRef} id="frame"
        />
        <canvas width={640} height={640} ref={canvasRef} />
      </div>
    </div>
  );
};

export default App;
