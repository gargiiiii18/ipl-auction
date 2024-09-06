import React, { useState, Fragment } from 'react';
// import './App.css'
import TeamCard from './TeamCard';
import AddTeam from './AddTeam';
function App() {

  const[isClicked, setClicked] = useState(false);

  function handleClick(){
    setClicked(true);
  }
 
  return (
    <Fragment>
    <div className='heading'>
     <h1>IPL Auction</h1>
     </div>
     <div className="teamContainer">
    <TeamCard/>
    <button onClick={handleClick} className='addTeamBtn'>Add Team</button>
    {isClicked &&
    <AddTeam/>
}
    </div>
    </Fragment>
  )
}

export default App
