cd ~/video-drop && mkdir -p drop && n=0
for id in IHjt6amFgyE 38QzSkFRn4E zhfOsKtD2vk VeHyQWutHPQ JwmxAagJ7bQ fc8rxAMb7xI \
          U9ZVpNscIGg -Y5bZoD6TM0 3nyxVHwDCTY 4_Ev1a1_2Mg 4Vbr9EQoGd4 wBbeP1w-NTQ \
          BmFrJuPdwxE 0LxFKZyaD-I 8L-cDJJBbxc yfcdobOQxcw _sp6jBv0EWA oqbLgvN8DCs \
          sqpNZmRg7oc zEkwjGCA2M4 EPS51oKRgpU XvyJvuj8NdM 4T9-0D4SnMk 4ajr7LFi170 \
          A-HTpnOfVcE Nl9vUi1_ha0 UN41NRg5Ul4 5EzQZ6y0shc j_KLuENJVaw fGBhk9oqdbg \
          i9lgxqlkUgQ QVw89_6fh2Y untay_co3oY rgLTiUZAWQY UXKY-hKJs6Q CQFSXmfxMV8 \
          MMELgpZ4CeQ vtY88mBc088 WSEAjQgHpYs USDQ8LIjaCo HywK8lbZ2wQ 0ipLPOAN_m8 \
          CnODsrMCQQg 4X7vf-KZoo0 -rqPeGKVPbA vzv3q4umREk Dp2q1lzUVlQ JyTKdxfD8no \
          aoWDLhcoQtE vKq803uJdos OTPaZw39P-8 mhUoe2JBxco QUqq7wSLE78 W0Lw4ox_n_M \
          Gu1jnDjEXT8 iyl_vVXeFuI mEZHigJCtls oRK7XLhGz_c n3FufrVltsc Fxjthnv7mBQ \
          VWeZ8m34BSk qTKk-cGcTZ4 CCLlstRUbAc hUZo3_gKm7k 7MmwcJxi0eA olIn0oJccHI \
          mKKDE17DkjY owTm2uYWym4 g7AcF_hQhvg CCTg_izVejI utYiiAb1Ngg WFmNYreKao8 \
          QnaMCHgQln8 -4hTQEnwa7s AtNlFBWBWPw emogd1h6o9A qLeCxfMLyU4 3dnTa3IoD9g \
          _JUvx36zOYw jvb442ddQVE OxFLGd4gIK0 1EV8XLSZsho 9hotlaRRkD0 0EjyaQ15IGQ \
          JXcULXtKu1Q KPFxQ-DpG3E Pd5MZajzxh0 JzGMXud3GWE VkAqhxUJjrw _zT8aWZh2x0 \
          wR42fihChx4 tB9rc9bJ63o yjPqeSZ36yo T4OkBqvhhGo zeAd9hezn-A m0zMjxe2Vgc \
          iuNHBypLG_4 h0hCWHzzgoE 5M0c_EwRQiI EBVoRuZdlVY iFdoGDFnT3c 6-d45BL5GoY \
          yAF1Bpa4m5Q -MtlVsMGiCo NFUuaZsR2S8 y5eb3xaRRPA JykOxC_6nEk eJVzSXsZ10I \
          IaOXKjvpP_E g36Y1YDdqoQ rg4NhBBW2pc uEYlq0M3ao8 T6IeD5ldw3s 3ELlDt_zN1E \
          jbQeUOZwhd4 EGkjoDqXcTY Kmzyo4mF_Gg KDTzgRAD8-Y dzuHSFA_Z2s AeDEjalJkq0; do
  if [ -f "drop/$id.mp4" ] || ls "drop/$id.mp4.part-"* >/dev/null 2>&1; then echo "have $id"; continue; fi
  echo "=== $id"
  ./yt-dlp-nightly --remote-components ejs:npm -4 --socket-timeout 30 --retries 15 \
    -f "134/396/135/bestvideo[height<=480]/bestvideo" \
    -o "drop/$id.mp4" -- "$id" || echo "FAILED $id (continuing)"
  if [ -f "drop/$id.mp4" ] && [ "$(stat -f%z "drop/$id.mp4" 2>/dev/null || stat -c%s "drop/$id.mp4")" -gt 99000000 ]; then
    echo "    splitting (over 95MB)"; split -b 95M "drop/$id.mp4" "drop/$id.mp4.part-" && rm -f "drop/$id.mp4"
  fi
  n=$((n+1)); [ $((n % 10)) -eq 0 ] && { git add drop && git commit -q -m "videos: +$n" && git push -q origin video-drop || echo "    push deferred"; }
  sleep 10
done
git add drop && git commit -m "videos: final batch" && git push origin video-drop
