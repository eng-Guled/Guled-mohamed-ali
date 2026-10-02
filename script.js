// Menu tabs
document.querySelectorAll('.tabs button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
const form=document.getElementById('form'), confirmEl=document.getElementById('confirm');
form.date.min=new Date().toISOString().split('T')[0];
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const submitButton=form.querySelector('button[type="submit"]');
  submitButton.disabled=true;
  confirmEl.hidden=false;
  confirmEl.classList.remove('error');
  confirmEl.textContent='Sending your reservation request...';
  try{
    const response=await fetch('/api/reservations',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'Could not send your request. Please try again.');
    confirmEl.textContent=result.message;
    form.reset();
  }catch(error){
    confirmEl.classList.add('error');
    confirmEl.textContent=error.message==='Failed to fetch'
      ?'Could not reach the reservation service. Please try again later.'
      :error.message;
  }finally{
    submitButton.disabled=false;
    confirmEl.scrollIntoView({behavior:'smooth',block:'center'});
  }
});
document.getElementById('year').textContent=new Date().getFullYear();
