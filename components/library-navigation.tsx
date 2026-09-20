"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export function LibraryNavigation() {
 const path=usePathname(),router=useRouter(),[palette,setPalette]=useState(false),[menu,setMenu]=useState(false);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPalette(true)}if(e.key==="Escape")setPalette(false)};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[]);
 const items=[["Library","/library"],["Explore","/explore"],["My Library","/my-library"]] as const;
 const go=(href:string)=>{setPalette(false);router.push(href)};
 return <><header className="global-nav"><a className="brand-lockup" href="/library"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><nav>{items.map(([label,href])=><a className={path===href?"active":""} href={href} key={href}>{label}</a>)}<a href="/admin">Admin</a></nav><div className="nav-utilities"><button aria-label="Search" onClick={()=>setPalette(true)}>⌕</button><button className="avatar" aria-label="Open account menu" onClick={()=>setMenu(!menu)}>D</button>{menu&&<div className="account-menu"><a href="/my-library">My Library</a><a href="/sign-in">Account</a><button onClick={()=>void supabase.auth.signOut().then(()=>router.push("/sign-in"))}>Sign out</button></div>}</div></header>{palette&&<div className="command-backdrop" onMouseDown={()=>setPalette(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={e=>e.stopPropagation()}><div>⌕<input autoFocus placeholder="Search commands..." /></div><p>Navigate</p>{items.map(([label,href])=><button key={href} onClick={()=>go(href)}><span>{label}</span><kbd>↵</kbd></button>)}<button onClick={()=>go("/admin")}><span>Open Admin</span><kbd>↵</kbd></button></section></div>}</>;
}
