![IMG](https://img.shields.io/badge/React-js-61daf8?logo=react)
![IMG](https://img.shields.io/badge/Render%20Engine-Three.js-049EF4?labelColor=bbbbbb&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAUhJREFUOI2V07tLHWEQBfDfVYkgllpYBG0Eq4AYrGKhdoKg1yZ9ihRi779gWovEJgQbxcdVEG18oCISEkKQICpCUEkTDAoSBcFXsXNxuVxhPbCcM8zOmflm96vEDjrQjd/455mYCK7HT+yhgKEsxRW4Dj2MT/iFPC5wiiV8xKunDGbxLZ4xVEeuHe/C6EPoQ8zhfdEgF3yEr6jEfzRgFIuYRx++4E/kL9CJ2qJBIcaGfdxhF8dowg3G4zgL6I1jrRcnmQxexRtMR/wSf/E93unH5zB7m95FHidojXg+eAWvPX6pQdyiRxkcYEqy1Bmsxfilhl3polxKz2Ig9DbqJP/FGRpxjxFslusuusNG8Ewqd4SWckVVKT2BK9SUTLcs2c15OYNcSbwV3V6gGZeSO3ItIwopvZ2loKokvgv+gbasXdMYkNzGzHgAnsxNPK0NfZMAAAAASUVORK5CYII=) [![IMG](https://img.shields.io/badge/Material-Design-0081CB?labelColor=444444&logo=material-ui)](https://material-ui.com/)

[![IMG](https://img.shields.io/badge/Youtube-Demo-222222?labelColor=ff0000&logo=youtube)](https://youtu.be/9aBT-rlF9pE)
[![IMG](https://img.shields.io/badge/Play%20with-online%20Demo-222222?logo=github)](https://linwe2012.github.io/Spline)

Implements spline & parameterization of a spline.

This project is 1st course project for computer animations in ZJU.
- Lab 1: Spline (This project)
- Lab 2: [Free form deformation](https://github.com/linwe2012/FreeFormDeformation)
- Lab 3: [Fuzzy Shape warp](https://github.com/linwe2012/FuzzyWarp)

**Try online demo yourself in Github pages: https://linwe2012.github.io/Spline**

Watch full demo online: https://youtu.be/9aBT-rlF9pE
[![Gif Demo](https://j.gifs.com/5QDPOA.gif)](https://youtu.be/9aBT-rlF9pE)

## Brief Description

The Cardinal Splines algorithm will sample 4 points to generate a spline between the middle 2 points. The weight of 4 points are funtions defined over \[0, 1\]. The input to the function is the interval of the middle 2 points mapped to \[0, 1\].

<img width="500px" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/HermiteBasis.svg/1200px-HermiteBasis.svg.png" />

In the GUI, there are following adjustable parameters:

- Tau: it adjust the tightness of the spline. The larger tau is, the corner will be less sharp.
- Granularity: it change number of samples between 2 points.

Finally, the splines can be parametrized, meaning that we split the spline evenly. This allows animated charaters to walk on the spline with a 
uniform speed or with any speed function. Otherwise, they will walk slower when control points are closer and faste when control points are larger.

In the implemnentation, each spline object contains full set of parameters. They can be animated between different tau values and parameterized seperately. The result are rendered with three.js for smooth animation. The user interface is created with React.js and MaterialUI.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
