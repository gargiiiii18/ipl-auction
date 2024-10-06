import React, {useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
const AddBid = () => {

const [bid, setBid]  = useState(""); 


const {team_id} = useParams();
const navigate = useNavigate();

const handleChange = (event) => {
    setBid(event.target.value);
    // console.log(bid); 
}

const handleSubmit = async (event) => {
  event.preventDefault();
  console.log(bid);
  const url = `http://localhost:3000/teams/${team_id}`
  try {
    const body = {bid};
    const response = await fetch(url, {
      method: 'POST',
      headers: {"Content-Type" : "application/json"},
      body: JSON.stringify(body)
    });

    const data = await response.json();
    // console.log(response.status);
    // console.log(body);
    if(data.status==="success"){
      console.log("redirecting..."); 
      // window.location.href=`http://localhost:5173/${team_id}`;
      navigate(`/teams/${team_id}`);
    }
    else if(data.status==="error"){
      setMessage(data.message);
      setShowBid(false);
      // console.log("Failed to add bid");
    }
  } catch (error) {
    console.log(error);
  }
}


  return (
    <div>
       {/* <h2>Current Player: {currentPlayer}</h2> */}
       {message && 
       <h2>{message}</h2>
       }
       <form className='bidForm' action="">
        <label htmlFor="bid">Bid</label>
        <input type="text" value={bid} onChange={handleChange}/>
        <button className='submitBid' onClick={handleSubmit}>Done</button>
       </form>
    </div>
  )
}

export default AddBid
