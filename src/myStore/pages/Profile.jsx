import React, { useState } from 'react';
import './Profile.css';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutGrid, Briefcase, Package, Heart, Star, Clock, MapPin, Globe, MessageCircle, UserPlus, Check, BadgeCheck, ShoppingCart, ChevronRight, Search, UserRound } from 'lucide-react';
import { Dropdown, inputCls } from '../../components/productForm/ProductFormFields';
import { CATEGORY_STYLE } from '../../pages/Market';
import { servicePrice } from '../data/serviceFields';
import { addItem } from '../../store/cartSlice';

const panel = 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm';
const primary = 'bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange text-white rounded-lg font-semibold';

function ListingCard({ item, service, favorite, onFavorite, onAdd, added }) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = service ? Briefcase : CATEGORY_STYLE[item.category]?.icon || Package;
  return (
    <article className={`${panel} min-w-0 overflow-hidden flex flex-col`}>
      <div className={`${service ? 'store-service-image' : 'store-product-image'} relative ${service ? 'aspect-[6/5]' : 'aspect-square'} bg-gray-50 dark:bg-gray-800 flex items-center justify-center`}>
        {item.images?.[0] && !imageFailed ? <img src={item.images[0]} onError={() => setImageFailed(true)} alt={item.name} className="w-full h-full object-cover" /> : <Icon size={48} className="text-[#fa3f5e]/60" />}
        {service && <span className="absolute top-3 left-3 p-2 rounded-lg bg-white/95 dark:bg-gray-900/95 text-[#fa3f5e]"><Icon size={17} /></span>}
        <button type="button" onClick={onFavorite} aria-label={`${favorite ? 'Unsave' : 'Save'} ${item.name}`} aria-pressed={favorite} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center"><Heart size={17} className={favorite ? 'fill-[#fa3f5e] text-[#fa3f5e]' : 'text-gray-500'} /></button>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white break-words">{item.name}</h3>
        {service && <p className="text-xs leading-5 text-gray-500 dark:text-gray-400 mt-2 flex-1">{item.description}</p>}
        <div className={`flex flex-wrap items-center justify-between gap-2 ${service ? 'border-t border-gray-100 dark:border-gray-800 pt-3 mt-3' : 'mt-2'}`}>
          {service && <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><Clock size={13} />{item.duration || '1 hour'}</span>}
          <span className="text-sm font-bold text-[#fa3f5e]">{service && item.rateType === 'Starting from' ? <><span className="text-[10px] font-normal text-gray-400 mr-1">From</span>${item.price}</> : service ? servicePrice(item) : `$${item.price.toFixed(2)}`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2 mb-4"><Star size={13} className="fill-amber-400 text-amber-400" />{item.rating > 0 ? <><span className="font-semibold text-gray-700 dark:text-gray-200">{item.rating}</span><span>({item.reviews || 0})</span></> : 'New listing'}</div>
        {service ? <><button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className={`${primary} w-full mt-auto py-2.5 px-3 flex items-center justify-between text-xs`}>{expanded ? 'Hide service' : 'View service'}<ChevronRight size={15} className={expanded ? 'rotate-90' : ''} /></button>{expanded && <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-5"><p>{item.method || 'At customer location'}</p>{item.highlights?.map((highlight) => <p key={highlight}>• {highlight}</p>)}<p className="mt-2">Contact the store to discuss availability.</p></div>}</> : <button type="button" onClick={onAdd} className="mt-auto w-full py-2.5 text-xs font-semibold text-[#fa3f5e] border border-[#fa3f5e]/40 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/10 flex items-center justify-center gap-2">{added ? <Check size={15} /> : <ShoppingCart size={15} />}{added ? 'Add another' : 'Add'}</button>}
      </div>
    </article>
  );
}

export default function StoreProfile() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.userObject);
  const services = useSelector((state) => state.services.items).filter((item) => item.status === 'Published' && item.visible);
  const products = useSelector((state) => state.products.items).filter((item) => (item.status || (item.rating > 0 ? 'Active' : 'Draft')) === 'Active');
  const cart = useSelector((state) => state.cart.items);
  const [params, setParams] = useSearchParams();
  const tab = ['All', 'Services', 'Products'].includes(params.get('tab')) ? params.get('tab') : 'All';
  const setTab = (value) => setParams((current) => { const next = new URLSearchParams(current); next.set('tab', value); return next; }, { replace: true });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState('Recommended');
  const [favorites, setFavorites] = useState({});
  const [following, setFollowing] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const name = user?.name || user?.full_name || 'Alex Morgan';
  const avatar = user?.profile_picture || user?.avatar;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const shownProducts = products.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()) && (category === 'All categories' || item.category === category)).sort((a, b) => sort === 'Price: Low to high' ? a.price - b.price : sort === 'Price: High to low' ? b.price - a.price : sort === 'Top rated' ? b.rating - a.rating : 0);
  const toggleFavorite = (key) => setFavorites((current) => ({ ...current, [key]: !current[key] }));
  const add = (item) => {
    dispatch(addItem({ id: item.id, name: item.name, subtitle: item.dimensions, brand: item.vendor, price: item.price, category: item.category }));
    setNotice(`${item.name} added to your cart.`);
  };
  return (
    <div className={`store-profile ${tab === 'Services' ? 'store-profile--services' : 'store-profile--products'} max-w-[1280px] ml-auto px-4 md:px-8 pt-6 pb-10`}>
      <div className={`store-profile-layout grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px] xl:grid-cols-[minmax(0,1fr)_240px] gap-4 ${tab === 'Services' ? 'items-stretch' : 'items-start'}`}>
        <main className="min-w-0">
          <section aria-label="Store profile" className={`store-profile-header ${panel} p-4 lg:p-5 grid grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[112px_minmax(0,1fr)] items-center gap-x-5 gap-y-3`}>
            <div className="store-profile-avatar relative flex-shrink-0"><div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">{avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <UserRound size={48} className="text-[#fa3f5e]" />}</div>{user?.is_verified && <BadgeCheck className="absolute bottom-1 right-0 text-[#fa3f5e] fill-white dark:fill-gray-900" size={27} />}</div>
            <div className="min-w-0"><h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-words">{name}’s Store</h1><p className="flex items-center gap-1.5 text-xs text-insta-purple font-semibold mt-2">{user?.is_verified && <BadgeCheck size={14} />}{user?.is_verified ? 'Verified creator' : 'Personal Store'}</p><p className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-3"><Star size={15} className="fill-amber-400 text-amber-400" />{user?.rating > 0 ? <><span className="font-semibold text-gray-900 dark:text-white">{user.rating}</span><span className="ml-2">{user.reviews || 0} reviews</span></> : 'No store reviews yet'}</p><p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3">Professional · Trusted · Reliable</p></div>
            <div className="store-profile-actions col-span-2 flex flex-wrap justify-end gap-2"><Link to="/messages" className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"><MessageCircle size={15} />Message</Link><button type="button" aria-pressed={following} onClick={() => setFollowing(!following)} className={`${primary} flex items-center gap-2 px-4 py-2.5 text-xs`}>{following ? <Check size={15} /> : <UserPlus size={15} />}{following ? 'Following' : 'Follow'}</button></div>
          </section>
          <div role="tablist" aria-label="Store listings" className={`store-profile-tabs ${panel} flex mt-3 mb-3 overflow-hidden`}>
            {[['All', LayoutGrid], ['Services', Briefcase], ['Products', Package]].map(([value, Icon]) => <button key={value} id={`profile-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls="profile-listings" onClick={() => setTab(value)} className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${tab === value ? 'border-[#fa3f5e] text-[#fa3f5e]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{React.createElement(Icon, { size: 17 })}{value}</button>)}
          </div>
          <div id="profile-listings" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} className="space-y-6">
            {tab !== 'Products' && <section aria-label="Services"><h2 className={tab === 'All' ? 'text-lg font-bold text-gray-900 dark:text-white mb-3' : 'sr-only'}>Services</h2><div className="store-service-grid grid grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-3 lg:grid-cols-3 gap-3">{services.map((item) => <ListingCard key={item.id} item={item} service favorite={!!favorites[`service-${item.id}`]} onFavorite={() => toggleFavorite(`service-${item.id}`)} />)}{!services.length && <p className="col-span-full py-10 text-center text-gray-400">No published services yet.</p>}</div></section>}
            {tab !== 'Services' && <section aria-label="Products"><h2 className={tab === 'All' ? 'text-lg font-bold text-gray-900 dark:text-white mb-3' : 'sr-only'}>Products</h2><div className="store-product-filters flex flex-wrap gap-3 mb-4"><div className="relative flex-1 min-w-0 basis-48"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input aria-label="Search products" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputCls} pl-9`} /></div><Dropdown className="w-full sm:w-40" value={category} options={['All categories', ...new Set(products.map((item) => item.category))]} onChange={setCategory} /><Dropdown className="w-full sm:w-44" value={sort} options={['Recommended', 'Price: Low to high', 'Price: High to low', 'Top rated']} onChange={setSort} /></div><div className="store-product-grid grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3">{shownProducts.map((item) => <ListingCard key={item.id} item={item} favorite={!!favorites[`product-${item.id}`]} onFavorite={() => toggleFavorite(`product-${item.id}`)} onAdd={() => add(item)} added={cart.some((entry) => entry.id === item.id)} />)}{!shownProducts.length && <p className="col-span-full py-10 text-center text-gray-400">No products match your search.</p>}</div><p role="status" className="text-xs text-[#fa3f5e] mt-3">{notice}</p></section>}
          </div>
        </main>
        <aside aria-label="Store information" className={`space-y-4 min-w-0 ${tab === 'Services' ? 'flex flex-col' : 'md:sticky md:top-6'}`}>
          {tab !== 'Services' && (
            <Link to="/cart" aria-label={`My Cart, ${count} ${count === 1 ? 'item' : 'items'}`} className={`${panel} min-h-[96px] px-4 py-5 flex items-center gap-3 hover:shadow-md transition-shadow`}>
              <span className="relative w-12 h-12 shrink-0 rounded-full bg-gradient-to-r from-insta-purple via-insta-pink to-insta-orange flex items-center justify-center text-white">
                <ShoppingCart size={26} strokeWidth={1.5} />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-white dark:bg-gray-800 text-[#fa3f5e] border border-gray-100 dark:border-gray-700 rounded-full text-[10px] font-medium">{count}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">My Cart</span>
                <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">{count} {count === 1 ? 'item' : 'items'}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-gray-700 dark:text-gray-300" />
            </Link>
          )}
          {tab !== 'Products' && <div className={`${panel} p-4 lg:p-5 flex-1 divide-y divide-gray-100 dark:divide-gray-800`}><section className="pb-5"><h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">About {name.split(' ')[0]}</h2><p className="text-xs leading-6 text-gray-500 dark:text-gray-400">{user?.bio || 'Helping you make everyday life simpler with thoughtful services and useful products. Explore the store to find what works for you.'}</p></section><section className="py-5 flex items-start gap-3"><span className="w-9 h-9 rounded-full bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e] flex items-center justify-center shrink-0"><Clock size={19} /></span><p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Message the store for availability and response times.</p></section><section className="py-5"><h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Service areas</h2><div className="flex gap-3"><span className="w-9 h-9 rounded-full bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e] flex items-center justify-center shrink-0"><MapPin size={19} /></span><div><p className="text-xs leading-5 text-gray-500 dark:text-gray-400">At your location and online, depending on the service.</p><button type="button" aria-expanded={areasOpen} onClick={() => setAreasOpen(!areasOpen)} className="text-xs font-semibold text-[#fa3f5e] mt-3">{areasOpen ? 'Hide areas' : 'View all areas'}</button>{areasOpen && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-5">Contact the store to confirm coverage for your address.</p>}</div></div></section><section className="pt-5"><h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Languages</h2><p className="flex gap-3 items-center text-xs text-gray-500 dark:text-gray-400"><span className="w-9 h-9 rounded-full bg-pink-50 dark:bg-pink-900/20 text-[#fa3f5e] flex items-center justify-center shrink-0"><Globe size={19} /></span>English</p></section></div>}
        </aside>
      </div>
    </div>
  );
}
