const form=document.querySelector("#chatForm");
const input=document.querySelector("#messageInput");
const messages=document.querySelector("#messages");
const welcome=document.querySelector("#welcome");
const sendButton=document.querySelector("#sendButton");
const historyList=document.querySelector("#historyList");
const toast=document.querySelector("#toast");
const sidebar=document.querySelector(".sidebar");
let chats=[];
let activeChat=null;
let busy=false;

function notify(text){toast.textContent=text;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2600)}
function newChat(){
  const chat={id:crypto.randomUUID(),title:"Новый диалог",messages:[]};
  chats.unshift(chat);activeChat=chat.id;renderHistory();renderChat();input.focus();
}
function current(){return chats.find(c=>c.id===activeChat)}
function renderHistory(){
  historyList.replaceChildren();
  chats.forEach(c=>{
    const b=document.createElement("button");b.className="history-item"+(c.id===activeChat?" active":"");b.textContent=c.title;
    b.onclick=()=>{activeChat=c.id;renderHistory();renderChat();sidebar.classList.remove("open")};historyList.appendChild(b);
  });
}
function renderMarkdown(text){
  // Minimal safe formatting: escape HTML first, then support fenced code and basic paragraphs.
  const escaped=text.replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const parts=escaped.split(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g);
  return parts.map((part,i)=>i%2===1?`<pre><code>${part.trim()}</code></pre>`:part.split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,"<br>")}</p>`).join("")).join("");
}
function renderChat(){
  const c=current();messages.replaceChildren();welcome.style.display=c&&c.messages.length?"none":"block";
  if(!c)return;
  c.messages.forEach(m=>{
    const row=document.createElement("div");row.className="message "+m.role;
    const avatar=document.createElement("div");avatar.className="avatar";avatar.textContent=m.role==="bot"?"ϟ":"●";
    const bubble=document.createElement("div");bubble.className="bubble";
    if(m.role==="bot")bubble.innerHTML=renderMarkdown(m.text);else bubble.textContent=m.text;
    if(m.role==="bot"){row.append(avatar,bubble)}else{row.append(bubble,avatar)}
    messages.appendChild(row);
  });
  document.querySelector("#chatArea").scrollTop=document.querySelector("#chatArea").scrollHeight;
}
async function send(text){
  text=(text||"").trim();if(!text||busy)return;
  if(!activeChat)newChat();
  const c=current();c.messages.push({role:"user",text});
  if(c.messages.length===1)c.title=text.slice(0,32)+(text.length>32?"…":"");
  input.value="";resizeInput();busy=true;sendButton.disabled=true;renderHistory();renderChat();
  const waiting={role:"bot",text:"⏳ STORM BOT думает…"};c.messages.push(waiting);renderChat();
  try{
    const response=await fetch("/.netlify/functions/chat",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:c.messages.filter(m=>m!==waiting).map(m=>({role:m.role==="bot"?"assistant":"user",content:m.text})).slice(-16)})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Сервис временно недоступен");
    waiting.text=data.reply||"Модель вернула пустой ответ.";
  }catch(e){waiting.text="⚠️ Не получилось получить ответ.\n\n"+(e.message||"Проверь подключение и настройки Netlify.")+"\n\nЕсли сайт ещё не опубликован через Netlify, ИИ пока не подключён."}
  finally{busy=false;sendButton.disabled=false;renderChat();renderHistory();input.focus()}
}
function resizeInput(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px"}
form.addEventListener("submit",e=>{e.preventDefault();send(input.value)});
input.addEventListener("input",resizeInput);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
document.querySelector("#newChat").addEventListener("click",()=>{newChat();sidebar.classList.remove("open")});
document.querySelector("#menuButton").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.prompt)));
newChat();
