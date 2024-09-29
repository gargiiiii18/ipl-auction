import React, {Fragment, useState} from 'react';
import { BrowserRouter } from 'react-router-dom';
import TeamCard from './TeamCard';
import AddTeam from './AddTeam';
import PlayerCard from './PlayerCard';

const Homepage = () => {

  const[isClicked, setClicked] = useState(false);
  const[buttonText, setButtonText] = useState("Add Team");
  
  function handleClick(){
    setClicked(!isClicked);
   setButtonText(isClicked?'Add Team':'Close')
  }

  return (
    <Fragment>
      <div className='heading'>
     <h1>IPL Auction</h1>
     </div>
     <div className="teamContainer">
    <TeamCard/>
    <button onClick={handleClick} className='addTeamBtn'>{buttonText}</button>
    {isClicked &&
    <AddTeam/>
}
    <PlayerCard/>
    </div>
    </Fragment>
  )
}

export default Homepage
