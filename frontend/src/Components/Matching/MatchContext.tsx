import React, { createContext, useState, useEffect, useCallback } from "react";
import { User } from "../User";
import { Chats } from "../Chats";
import { getCache, setCache } from '../../utils/clientCache';
// This file provides access to the MatchContext which stores information to be used across match components

interface MatchContextType {
    candidates: User[] | null;
    buddies: User[] | null;
    chatrooms: Chats[] | null;
    updateContext: () => void;

}

interface MatchContextProviderProps {
    children: React.ReactNode;
}

const MatchContext = createContext<MatchContextType | null>(null);

const MatchContextProvider = ({ children }: MatchContextProviderProps) => {
    const [candidates, setCandidates] = useState<User[] | null>(null);
    const [buddies, setBuddies] = useState<User[] | null>(null);
    const [chatrooms, setChatrooms] = useState<Chats[] | null>(null);
    const updateCallback = useCallback(async () => {
        await updateContext();
    }, [])

    useEffect(() => {
        updateContext(); // run once on initial load
        const interval = setInterval(updateCallback, 5000);
        return () => { clearInterval(interval); }
    }, [updateCallback]);

    const updateContext = () => {
        updateCandidates();
        updateBuddies();
        updateChatrroms();
    };

    const updateCandidates = () => {
        const key = '/matches/candidates';
        const cached = getCache(key);
        if (cached) {
            setCandidates(cached);
            return;
        }
        fetch(key)
        .then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    setCandidates(data);
                    setCache(key, data, 5000);
                })
            } else {
                console.log(response.status);
            }
        })

    };

    const updateBuddies = () => {
        const key = '/matches/buddies';
        const cached = getCache(key);
        if (cached) {
            setBuddies(cached);
            return;
        }
        fetch(key)
        .then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    // endpoint may return a full array (legacy) or a paginated object { buddies, total, page, limit }
                    let out: any[] = [];
                    if (Array.isArray(data)) {
                        out = data;
                    } else if (data && data.buddies) {
                        out = data.buddies;
                    }
                    setBuddies(out);
                    setCache(key, out, 30000);
                })
            } else {
                console.log(response.status);
            }
        })
    };

    const updateChatrroms = ()=>{
        fetch('/chats/')
        .then((response)=>{
            if(response.ok){
                return response.json()
            }
            else{
                console.log(response.status);
            }
            
        })
        .then((data)=>{
            
            const chats = data.map((chat:any)=>{
                if(chat.meetspot){
                    if(chat.meetTime){
                        return{
                            chatid: chat.id,
                            title: chat.title,
                            users: chat.users,
                            meetspot: chat.meetspot,
                            meetTime: chat.meetTime
                        }
                    }
                    else{
                        return{
                            chatid: chat.id,
                            title: chat.title,
                            users: chat.users,
                            meetspot: chat.meetspot,
                            meetTime: ""
                        }
                    }
                    
                }
                else{
                    if(chat.meetTime){
                        return{
                            chatid: chat.id,
                            title: chat.title,
                            users: chat.users,
                            meetspot: null,
                            meetTime: chat.meetTime

                        }
                    }
                    else{
                        return{
                            chatid: chat.id,
                            title: chat.title,
                            users: chat.users,
                            meetspot: null,
                            meetTime: ""
                        }
                    }
                    
                }
                
            })
            
            setChatrooms(chats)
        })
    }

    return (
        <MatchContext.Provider value={{ 
            candidates, 
            buddies,
            chatrooms,
            updateContext }}>
            {children}
        </MatchContext.Provider>
    )
}

export { type MatchContextType, MatchContext, MatchContextProvider };
