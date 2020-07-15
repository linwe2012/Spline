import React, {useEffect, useState, useRef} from 'react';
import './App.css';
import Render from './render'
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import { green, orange, blue } from '@material-ui/core/colors';
import CssBaseline from '@material-ui/core/CssBaseline';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import Switch from '@material-ui/core/Switch';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Fab from '@material-ui/core/Fab';
import DeleteIcon from '@material-ui/icons/Delete';

import {Samplers} from './spline'

const theTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary:{
      main: blue[500]
    }
  },
});

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(3),
    // textAlign: 'center',
    marginTop: theme.spacing(1),

  },
  rawpaper: {
    padding: theme.spacing(3),
    // textAlign: 'center',
    marginTop: theme.spacing(1),
    boxShadow: 'none'
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
  },
  button: {
    margin: theme.spacing(1),
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 160,
  },
  littlePanel: {
    width: 200,
    height: 200
  },
  detailPanel: {
    flexDirection: 'column'
  },
  Right:{
    maxHeight: '100vh',
    overflowY: 'scroll'
  },
}));

const PrettoSlider = withStyles(theme => ({
  root: {
    color: theme.primary,
    height: 8,
  },
  thumb: {
    height: 24,
    width: 24,
    backgroundColor: '#fff',
    border: '2px solid currentColor',
    marginTop: -8,
    marginLeft: -12,
    '&:focus,&:hover,&$active': {
      boxShadow: 'inherit',
    },
  },
  active: {},
  valueLabel: {
    left: 'calc(-50% + 4px)',
  },
  track: {
    height: 8,
    borderRadius: 4,
  },
  rail: {
    height: 8,
    borderRadius: 4,
  },
}))(Slider);

function FixedMaxWidth (props){
  const thediv = useRef(null)
  const wrap = useRef(null)
  useEffect(()=>{
    console.log('set',wrap.current.style.width )
    thediv.current.style.width = wrap.current.style.width
  })
  return(
    <div ref={wrap} className='canvas-frame-wrapper'>
      <div ref={thediv} id="canvas-frame" className="canvas-frame"></div>
      {props.children}
    </div>
  )
}


function App() {
  const [spacing, setSpacing] = React.useState(2);
  const [tau, setTau] = React.useState(0.5)
  const [gran, setGran] = React.useState(20)
  const [img, setImg] = React.useState(false)
  const [imgSpeed, setImgSpeed] = React.useState(1.0)
  const [disableRest, setDisableRest] = React.useState(false)
  const [cleanup, setCleanup] = React.useState(false)
  const [param, setParam] = React.useState(false)
  const [imgArr, setImgArr] = React.useState([])
  const [whichImg, setWhichImg] = React.useState(0)
  const [whichSampler, setWhichSampler] = React.useState('linear')

  const classes = useStyles();

  function onChangeTau(e, val) {
      setTau(val)
  }
  function onChangeGran(e, val) {
      setGran(val)
  }
  function onChangeImg() {
    setImg(!img)
  }

  function onChangeImgSpeed(e, val) {
    setImgSpeed(val)
  }

  function onDisableAll() {
    setDisableRest(!disableRest)
  }

  function resetScene() {
    setImg(false)
    setDisableRest(false)
    setCleanup(true)
  }
  function resetDone() {
    setCleanup(false)
  }
  function handleSelectImg(event) {
    setWhichImg(event.target.value)
  }
  function handleSelectSampler(event) {
    setWhichSampler(event.target.value)
  }
  function setImgsArr(i) {
    setImgArr(i)
  }

  return (
    <ThemeProvider theme={theTheme}>
      <CssBaseline>
        <div className="App">
          <Grid container direction="row" className={classes.root} spacing={0}>
            <Grid item xs={8}>
              <FixedMaxWidth>
                <Render 
                  tau={tau} gran={gran} 
                  theimg={img} imgSpeed={imgSpeed} 
                  colorGroup={blue} bifrost={disableRest} 
                  cleanup={cleanup} oncleanupDone={resetDone} 
                  elId={"canvas-frame"}
                  enable_param={param}
                  getImg={setImgsArr}
                  selectImg={whichImg}
                  selectSampler={whichSampler}
                  ></Render>
              </FixedMaxWidth>
            </Grid>
            <Grid item xs={4} className={classes.Right}>
              <div className='ctrl'>
              
              <ExpansionPanel>
                <ExpansionPanelSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  <Typography className={classes.heading}>使用方法</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <Typography>
                    左侧任意点击创建点
                     ，选中点拖拽重定位
                    </Typography>
                  
                </ExpansionPanelDetails>
                <ExpansionPanelDetails>
                  <div id="control-canvase"></div>
                </ExpansionPanelDetails>
              </ExpansionPanel>

              <ExpansionPanel>
                <ExpansionPanelSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  <Typography >Spline Basic Control</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.detailPanel}>
                  <Paper className={classes.paper}>
                    <Typography id="tau">
                      Choose Tau Value
                    </Typography>
                    <div className='slide'>
                      <PrettoSlider  onChangeCommitted={onChangeTau} max={1} min={0} step={0.01} valueLabelDisplay="auto" aria-label="tau" defaultValue={0.5} />
                    </div>
                  </Paper> 
                  <Paper className={classes.paper}>
                    <Typography id="gran">
                    Granularity
                    </Typography>
                    <div className='slide'>
                      <PrettoSlider disabled={disableRest} onChangeCommitted={onChangeGran} max={50} min={2} step={1} valueLabelDisplay="auto" aria-label="gran" defaultValue={20} />
                    </div>
                  </Paper>
                </ExpansionPanelDetails>
                </ExpansionPanel>

                <ExpansionPanel>
                <ExpansionPanelSummary
                  expandIcon={<ExpandMoreIcon />}
                >
                  <Typography >Image Player</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.detailPanel}>
                <Paper className={classes.rawpaper}>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={img}
                        onChange={onChangeImg}
                        value="checkedA"
                        color="primary"
                        inputProps={{ 'aria-label': 'secondary checkbox' }}
                        disabled={disableRest}
                      />
                    }
                    label="Run Shinnosuke"
                  />
                  <Paper className={classes.rawpaper}>
                  <FormControl variant="filled" className={classes.formControl}>
                    <InputLabel htmlFor="select-img">Select Image</InputLabel>
                    <Select
                      value={whichImg}
                      onChange={handleSelectImg}
                      inputProps={{
                        name: 'img',
                        id: 'select-img',
                      }}
                    >
                      {
                        
                        imgArr.map((val, key)=> <MenuItem key={key} value={key}>{val.name}</MenuItem>)
                      }
                    </Select>
                  </FormControl>
                  </Paper>
                  <Paper className={classes.rawpaper}>
                  <Typography id="gran">
                    Animation Speed 
                  </Typography>
                  <div className='slide'>
                    <PrettoSlider disabled={disableRest} onChangeCommitted={onChangeImgSpeed} max={2.1} min={0.1} step={0.1} valueLabelDisplay="auto" aria-label="speed" defaultValue={1} />
                  </div>
                  </Paper>
                </Paper>
                </ExpansionPanelDetails>
                </ExpansionPanel>
                <Paper className={classes.paper}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={disableRest}
                        onChange={onDisableAll}
                        value="checkedA"
                        color="primary"
                        inputProps={{ 'aria-label': 'secondary checkbox' }}
                      />
                    }
                    label="Bifrost"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={param}
                        onChange={()=> setParam(!param)}
                        value="checkedA"
                        color="primary"
                        inputProps={{ 'aria-label': 'secondary checkbox' }}
                        disabled={disableRest}
                      />
                    }
                    label="Parametize"
                  />
                  <Paper className={classes.rawpaper}>
                  <FormControl variant="filled" className={classes.formControl}>
                    <InputLabel htmlFor="select-ease">Ease Function</InputLabel>
                    <Select
                      value={whichSampler}
                      onChange={handleSelectSampler}
                      inputProps={{
                        name: 'ease',
                        id: 'select-ease',
                      }}
                    >
                      {
                        Object.keys(Samplers).map((val, key)=> <MenuItem key={key} value={val}>{val}</MenuItem>)
                      }
                    </Select>
                  </FormControl>
                  </Paper>
                </Paper>
                <Fab  aria-label="delete" color="secondary" className={classes.button} onClick={resetScene}>
                  <DeleteIcon />
                </Fab >
                
              </div>
            </Grid>

          </Grid>
        </div>
    </CssBaseline >
    </ThemeProvider>
  );
}



export default App;
