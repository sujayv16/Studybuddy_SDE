import React, { useEffect, useRef, useState, useMemo, useCallback, useContext } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import './ShowBuddies.css';
import { LatLng } from "use-places-autocomplete";
import io from "socket.io-client";
import { MatchContext, MatchContextType } from "../Matching/MatchContext";
import { Container, Row, Col } from "react-bootstrap";
import ChatSpot from "./ChatSpots";
import { Chats } from "../Chats";

export default function ShowBuddies(){
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  // Always call hooks at the top level
  const {isLoaded} = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries: [] as any
  });
  const [selectedType, setSelectedType] = useState<string>("");
  
  // If no API key, show a fallback message instead of throwing error
  if (!apiKey) {
    return (
      <Container>
        <Row>
          <Col>
            <div className="alert alert-info studybuddy-info" style={{ 
              padding: '20px', 
              margin: '20px', 
              backgroundColor: 'var(--card-bg)', 
              border: '1px solid var(--border)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--text)'
            }}>
              <h4>🏫 IIT Jodhpur StudyBuddy</h4>
              <p>Maps feature temporarily unavailable, but you can still connect with your fellow IIT Jodhpur students!</p>
              <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Find study buddies from your university</li>
                <li>Join chat rooms and messaging</li>
                <li>Manage your profile and courses</li>
                <li>Match with students in similar subjects</li>
              </ul>
              <p><strong>All users shown are from IIT Jodhpur only!</strong></p>
              <p><small>Maps will show exact locations once Google Maps API is configured</small></p>
            </div>
          </Col>
          <Col md="auto"><ChatSpot onTypeSelect={() => {}} /></Col>
        </Row>
      </Container>
    );
  }

   if(!isLoaded) {return <div>Loading...</div>}
   
   return(
      <Container>
        <Row>
          <Col md={9}>
            <div className="d-flex mb-2">
              <input
                id="showbuddies-search-input"
                className="form-control"
                placeholder="Search buddies by name, course, or bio"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    const ev = new CustomEvent('showbuddies-search', { detail: val });
                    window.dispatchEvent(ev);
                  }
                }}
              />
              <button
                className="btn btn-outline-primary ms-2"
                onClick={() => {
                  const el = document.getElementById('showbuddies-search-input') as HTMLInputElement | null;
                  const val = el ? el.value : '';
                  const ev = new CustomEvent('showbuddies-search', { detail: val });
                  window.dispatchEvent(ev);
                }}
              >Search</button>
            </div>
            <Map selectedType={selectedType} />
          </Col>
          <Col md={3}><ChatSpot onTypeSelect={setSelectedType} /></Col>
        </Row>
      </Container>
   );
}


function Map( {selectedType}:any){
    
    const [latitude, setLatitude] = useState<any>();
    const [longitude, setLongitude] = useState<any>();
    const [markers, setMarkers] = useState<any>([{}]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<any>(null);
    const [username, setusername] = useState("");
    const [selectedMarker, setSelectedMarker] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);
    const [myDict, setMyDict] = useState<any>({})
    const matchContext = useContext(MatchContext) as MatchContextType;
    const [chatid, setChatid] = useState<string>("")
    const [roomjoined, setRoom] = useState<string[]>([])
    
    const[meetmarker, setmeet] = useState<any>(null)
    const[id, setid] = useState<any>(null)

    useEffect(() => {
      const newSocket = io("/meet-up");
      setSocket(newSocket);
    
      return () => {
        newSocket.close();
      };
    }, []);

    // Listen for search events from parent input
    useEffect(() => {
      const onSearch = (e: any) => {
        setSearchQuery(e.detail || '');
      };
      window.addEventListener('showbuddies-search', onSearch as EventListener);
      return () => window.removeEventListener('showbuddies-search', onSearch as EventListener);
    }, []);

    useEffect(()=>{
      
      if(selectedType){
        setChatid(selectedType)
      }
      
      
    },[selectedType])


    const buddiesList = matchContext.buddies ?
    matchContext.buddies.map((b)=>{
      return b.username;
      
    }):null;

    const candidatesList = matchContext.candidates ?
    matchContext.candidates.map((c)=>{
      return c.username;
      
    }):null;

    const chatrooms = matchContext.chatrooms?
    matchContext.chatrooms.map((room:Chats)=>{
        return room;
        
    }):null;

    
    useEffect(() => {
      if (chatrooms) {
        const newDict:any = {};
        const marker = {
          lat: null,
          lng: null,
          username: "Meet-up",
        }
        
        chatrooms.map((chatroom) => {
          if(chatroom.chatid in myDict){
            newDict[chatroom.chatid] = myDict[chatroom.chatid]
          }
          else{
            if(chatroom.meetspot){
              const marker1 = {
                lat: chatroom.meetspot.coordinates[1],
                lng: chatroom.meetspot.coordinates[0],
                username: chatroom.title+": Meet-up",
              }
              newDict[chatroom.chatid] = marker1 ;
            }
            else{
              newDict[chatroom.chatid] = marker
            }
            
          }
          
        });
        
        setMyDict(newDict);
      
      }
    }, [chatrooms]);
    
    
    
    useEffect(()=>{
      
      let r = roomjoined.map((room:string)=>{
        return room
      })
      
      Object.keys(myDict).map((key)=>{
          if(!r.includes(key)){
            r.push(key)
            
            socket.emit("join room",key)
          }
          
       
      })
      setRoom(r)
    },[myDict])




    useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
        console.log(position.coords.longitude)
        console.log(position.coords.latitude)
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
      
        fetch(`/users/post-loc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat,
                lng
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to post location data');
            }
            
        })
        .catch(error => {
            console.error(error);
        });


        const fetchUsers = (q = '') => {
          const params = new URLSearchParams();
          if (q) params.set('q', q);
          return fetch(`/users/get-users-inoneKm?${params.toString()}`)
        }

        const debouncedFetch = (q = '') => {
          if (searchRef.current) clearTimeout(searchRef.current);
          searchRef.current = setTimeout(() => {
            fetchUsers(q)
              .then((response) => {
                if (response.ok) {
                  return response.json();
                }
                throw response;
              })
              .then((data) => {
                const usersFromSameUniversity = data.usersFromSameUniversity || data.usersWithinOneKm || data.users || [];
                const user = data.username
                const newMarkers = usersFromSameUniversity.map((user:any) => {
                    return {
                      lat: user.location ? user.location.coordinates[1] : 0, // Handle missing location
                      lng: user.location ? user.location.coordinates[0] : 0, // Handle missing location
                      username: user.username,
                      buddies: user.buddies,
                      university: user.university,
                      courses: user.courses,
                      bio: user.bio
                    };
                });
                setMarkers(newMarkers);
                setusername(user)
              })
              .catch((error) => {
                console.log(error);
              });
          }, 300);
        }

        // initial fetch (no query)
        debouncedFetch('');
        
          
        
    });
    }, []);

    // Re-run search when searchQuery changes
    useEffect(() => {
      // only run after initial geolocation is set
      if (typeof latitude === 'undefined') return;
      if (searchRef.current) clearTimeout(searchRef.current);
      searchRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        fetch(`/users/get-users-inoneKm?${params.toString()}`)
          .then((response) => {
            if (response.ok) return response.json();
            throw response;
          })
          .then((data) => {
            const usersFromSameUniversity = data.usersFromSameUniversity || data.usersWithinOneKm || data.users || [];
            const user = data.username
            const newMarkers = usersFromSameUniversity.map((user:any) => {
                return {
                  lat: user.location ? user.location.coordinates[1] : 0,
                  lng: user.location ? user.location.coordinates[0] : 0,
                  username: user.username,
                  buddies: user.buddies,
                  university: user.university,
                  courses: user.courses,
                  bio: user.bio
                };
            });
            setMarkers(newMarkers);
            setusername(user)
          })
          .catch((error) => console.error(error));
      }, 300);
    }, [searchQuery, latitude]);

    
    
    useEffect(() => {
      if (socket) {
        socket.on("newmarker",(marker: any, room: any)=>{ 
          setmeet(marker)
          setid(room)
        
          
        });
        return () => {
          socket.close();
        }

      }
    }, [socket]);

    useEffect(()=>{
      const newdic:any = {}
      console.log("meetmarker")
      console.log(myDict)
      Object.keys(myDict).map((key:any)=>{
        if(id ===key){
          newdic[key] = meetmarker
        }
        else{
          newdic[key] = myDict[key]
        }
      })
      setMyDict(newdic)
    },[meetmarker])
    


  const OnCircleClick = async (event: any) => {
    // create a new marker when the map is clicked
    let group = "";
    chatrooms?.map((c)=>{
        if(c.chatid == chatid){
          group = c.title
        }
    })
    console.log(group)
    const marker = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      username: group+": Meet-up",
    }
    
    const newdic:any ={}
    Object.keys(myDict).map((key)=>{
      if(key === chatid){
        newdic[key] = marker
      }
      else{
        newdic[key] = myDict[key]
      }
      
    })

    if(socket && chatid){
      socket.emit("add-marker",chatid, marker);
    }
    
    setMyDict(newdic)
    

   
  };

    const renderMeetmarkers =()=>{
      
      return Object.keys(myDict).map((key, index)=>{
        if(myDict[key].lat && myDict[key].lng ){

          return <Marker key={index} position={{ lat: myDict[key].lat, lng: myDict[key].lng }} title = {myDict[key].username}  
                  icon = {{
                    url: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
                    scale: 10
                  }}
                  onClick={() => {
                    setSelectedMarker(myDict[key]);
                  }}
                  >
                  </Marker>;
        }
        
      })
    }

    var url = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    const renderMarkers = () => {
        return markers.map((marker:any, index:any) => {
          if(candidatesList?.includes(marker.username) || buddiesList?.includes(marker.username)){
            if(buddiesList && buddiesList.includes(marker.username)){
              url = "http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
            }
            else{
              url = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
            return <Marker key={index} position={{ lat: marker.lat, lng: marker.lng }} title = {marker.username}  
            icon = {{
              url: url,
              scale: 10
            }}
            onClick={() => {
              
              setSelectedMarker(marker);
            }}
            >
            </Marker>;
          }
         
        });
    };
    
    

    const loc = useMemo(()=>({lat:latitude, lng:longitude }),[latitude,longitude])
    return (<GoogleMap zoom = {15} center = {loc} mapContainerClassName = "map-container">
        {renderMarkers()}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            options={{
              pixelOffset: new google.maps.Size(0, -30),
            }}
            onCloseClick={() => {
              setSelectedMarker(null);
            }}
          >
            <div>{selectedMarker.username}</div>
          </InfoWindow>
        )}
        <Marker position={loc} title = "you" icon = {{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scale: 10
          }} 
          onClick={() => {
            setSelectedMarker({
              lat: loc.lat,
              lng: loc.lng,
              username: "you"
            });
          }}
          />

        {renderMeetmarkers()}
        
        {loc && (
        <Circle
          center={loc}
          radius={2000}
          options={{
            fillColor: "var(--primary)",
            fillOpacity: 0.2,
            strokeColor: "var(--primary)",
            strokeOpacity: 0.7,
            strokeWeight: 2,
          }}
          
        />
      )}

      {loc && (
        <Circle
          center={loc}
          radius={1000000}
          onClick ={OnCircleClick}
          options={{
            fillOpacity: 0,
            strokeOpacity: 0
          }}
        />
      )}
    </GoogleMap>);
     
}
