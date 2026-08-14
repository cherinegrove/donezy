# Knowledge Base Hosting Setup Guide

**Status**: ✅ Help system integrated into app  
**Next Step**: Deploy knowledge base to public URL

Choose ONE of these three options below. **Netlify is easiest** (recommended).

---

## Option 1: Netlify (⭐ RECOMMENDED - 2 minutes)

### Why Netlify?
- ✅ Easiest setup (automatic from GitHub)
- ✅ Free tier works great
- ✅ Fast CDN
- ✅ Auto-deploys on git push
- ✅ Custom domain support

### Setup Steps

1. **Go to Netlify**: https://netlify.com
2. **Sign up with GitHub** (if not already)
3. **Click "New site from Git"**
4. **Select your Donezy repository**: `cherinegrove/donezy`
5. **Configure build**:
   - Build command: (leave empty)
   - Publish directory: `knowledge-base`
6. **Click "Deploy site"**
7. **Wait 30 seconds for deployment**
8. **Get your URL**: Netlify gives you a random URL like `https://festive-hopper-123abc.netlify.app`

### Update App Config

After deployment, update the KB URL in the app:

```bash
# Edit this file:
src/utils/helpMapping.ts

# Change line 3 from:
export const KNOWLEDGE_BASE_URL = 'https://docs.donezy.io';

# To your Netlify URL:
export const KNOWLEDGE_BASE_URL = 'https://festive-hopper-123abc.netlify.app';
```

Then commit and push:
```bash
git add src/utils/helpMapping.ts
git commit -m "Update KB URL to Netlify hosting"
git push origin main
```

---

## Option 2: GitHub Pages (5 minutes)

### Why GitHub Pages?
- ✅ Free
- ✅ Built into GitHub
- ✅ No extra account needed
- ✅ Direct from repository

### Setup Steps

1. **Go to repository settings**: https://github.com/cherinegrove/donezy/settings
2. **Click "Pages"** (in left sidebar)
3. **Under "Source"**, select:
   - Branch: `main`
   - Folder: `/knowledge-base`
4. **Click "Save"**
5. **Wait 2-3 minutes for deployment**
6. **Get your URL**: GitHub shows you the URL (usually `https://cherinegrove.github.io/donezy/knowledge-base`)

### Update App Config

```bash
# Edit:
src/utils/helpMapping.ts

# Change line 3 to:
export const KNOWLEDGE_BASE_URL = 'https://cherinegrove.github.io/donezy/knowledge-base';
```

Then commit and push:
```bash
git add src/utils/helpMapping.ts
git commit -m "Update KB URL to GitHub Pages hosting"
git push origin main
```

---

## Option 3: GitBook (Best for Documentation - 10 minutes)

### Why GitBook?
- ✅ Beautiful design included
- ✅ Best for documentation
- ✅ Better search
- ✅ Easier to maintain
- ✅ Professional appearance

### Setup Steps

1. **Go to GitBook**: https://gitbook.com
2. **Create account** (free)
3. **Create new space**
4. **Choose "Import from GitHub"**
5. **Connect your repository**
6. **Point to knowledge-base folder** (if needed)
7. **Publish**
8. **Get your URL**: GitBook gives you a URL like `https://cherine.gitbook.io/donezy`

### Update App Config

```bash
# Edit:
src/utils/helpMapping.ts

# Change line 3 to:
export const KNOWLEDGE_BASE_URL = 'https://cherine.gitbook.io/donezy';
```

Then commit and push:
```bash
git add src/utils/helpMapping.ts
git commit -m "Update KB URL to GitBook hosting"
git push origin main
```

---

## Comparison

| Feature | Netlify | GitHub Pages | GitBook |
|---------|---------|--------------|---------|
| Setup Time | 2 min | 5 min | 10 min |
| Cost | Free | Free | Free |
| Search | Good | OK | Excellent |
| Design | Good | Basic | Excellent |
| CDN | Yes | Yes | Yes |
| Auto-deploy | Yes | Yes | No |
| Ease | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

---

## Quick Deployment Checklist

### Immediate (Next 5 min)
- [ ] Choose hosting option above
- [ ] Follow setup steps
- [ ] Get your KB URL
- [ ] Update `src/utils/helpMapping.ts` with KB URL

### Short-term (Next 10 min)
- [ ] Commit KB URL change
- [ ] Push to repository
- [ ] Test help button in app (should open KB)
- [ ] Verify all KB links work

### Testing
After deployment:

1. **Test KB is live**
   - Go to your KB URL in browser
   - Verify it loads
   - Search something

2. **Test help button in app**
   - Click ? icon in top navigation
   - Click "Browse Knowledge Base"
   - Verify KB opens in new tab

3. **Test article links**
   - Click different articles in help dropdown
   - Verify they open correctly

---

## Troubleshooting

### "KB doesn't load" or "404 error"
1. Check your KB URL is correct
2. Verify deployment completed (check status in Netlify/GitHub)
3. Wait another minute and try again
4. Clear browser cache (Ctrl+Shift+Del)

### "Help button doesn't appear"
1. Did you add HelpButton to TopBar? (Already done ✅)
2. Did you add HelpProvider to App.tsx? (Already done ✅)
3. Restart dev server: `npm run dev`
4. Clear browser cache

### "Help button appears but KB URL broken"
1. You haven't updated `KNOWLEDGE_BASE_URL` in `helpMapping.ts`
2. Update it with your hosting URL
3. Redeploy app

---

## After Deployment

Once KB is live:

1. **Users can access help instantly**
   - Click ? button in app
   - Browse full knowledge base
   - Read FAQ, shortcuts, etc.

2. **Support team can reference articles**
   - Share links with users
   - Reduces support burden
   - Improves response time

3. **Expand KB over time**
   - Add more articles based on feedback
   - Update with new features
   - Track what's most viewed

---

## Which Option Should I Pick?

**Pick Netlify if**:
- You want easiest setup
- You want automatic deployments
- You want good search

**Pick GitHub Pages if**:
- You don't want another account
- You're already comfortable with GitHub
- You want everything in one place

**Pick GitBook if**:
- You want best documentation design
- You plan to maintain KB long-term
- You want professional appearance

---

## Help System Status

### ✅ Completed
- Knowledge base created (18 articles)
- Help system code integrated into app
- Help button added to navigation
- App is ready for KB hosting

### ⏳ Next Steps
- Deploy KB to public URL
- Update KB URL in app config
- Test help button works

### 🎉 After That
- Users get self-service help
- Support burden reduced
- Knowledge base grows over time

---

**Ready to deploy? Pick an option above and follow the steps!**

Need help? Check:
- `knowledge-base/DEPLOYMENT_GUIDE.md` for KB details
- `HELP_SYSTEM_IMPLEMENTATION.md` for integration details
