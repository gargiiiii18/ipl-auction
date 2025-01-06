import React, {useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
const AddBid = ({showBid, onBidResponse, message}) => {

const [bid, setBid]  = useState(""); 
const [enoughBudgetMsg, setEnoughBudgetMsg] = useState("");
const[bidPlaced, setBidPlaced] = useState(false);

const navigate = useNavigate();
const team_id_obj = useParams();
const team_id = team_id_obj.team_id;

const handleChange = (event) => {
    setBid(event.target.value);
    // console.log(bid); 
}

const handleSubmit = async (event) => {
  event.preventDefault();
  console.log(bid);
  const url = `http://localhost:3000/teams/${team_id}`
  // console.log(team_id);
  
  try {
    const body = {bid};
    const response = await fetch(url, {
      method: 'POST',
      headers: {"Content-Type" : "application/json"},
      body: JSON.stringify(body)
    });

    const data = await response.json();
    // if(data.status==="success"){
    //   console.log("redirecting..."); 
    //   onBidResponse("success", message);
    
    //   navigate(`/teams/${team_id}`);
    //   setBid("");
    // }
    
    if(data.status==="error"){
     onBidResponse("error", data.message || "Failed to add bid.");
     setEnoughBudgetMsg(data.message);
     setBid("");
    }
    else if(data.status==="success"){
      console.log("redirecting..."); 
      onBidResponse("success", data.message);
      setEnoughBudgetMsg(data.message);
      navigate(`/teams/${team_id}`);
      setBid("");
      setBidPlaced(true);
      window.history.replaceState(null, '', '/');
    }
  } catch (error) {
    console.log(error);
  }
}


  return (
    <div>
       {/* <h2>Current Player: {currentPlayer}</h2> */}
       <h2>{enoughBudgetMsg}</h2>
       {!bidPlaced && 
       <form className='bidForm' action="">
        <label htmlFor="bid">Bid</label>
        <input type='number' value={bid} onChange={handleChange}/>
        <button className='submitBid' onClick={handleSubmit}>Done</button>
       </form>
}
    </div>
  )
}

export default AddBid
