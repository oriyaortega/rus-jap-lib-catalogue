"""Real LiveLib cover URLs (boocover) for books whose cover was LiveLib's generated opengraph image.
Adds them to demo_fixes.json as the book's cover."""
import json

C = 'https://s1.livelib.ru/boocover/'
M = {
    'gs4': '1011217937/200x305/0b14/Genki_Kavamura__Esli_vse_koshki_v_mire_ischeznut.jpg',
    'gs5': '1018102756/200x305/fbf2/Genki_Kavamura__Esli_tvoya_pamyat_ischeznet.jpg',
    'gs6': '1015558489/200x305/261f/Genki_Kavamura__Chelovek_s_millionom._Chto_my_teryaem_kogda_nahodim_dengi.jpg',
    'gs7': '1005746770/200x305/1306/Yasusi_Kitagava__Blagodarya_vstreche_s_toboj._Sem_svidanij_kotorye_izmenili_moyu.jpg',
    'gs8': '1015685320/200x305/d8dd/Yasusi_Kitagava__Schaste_za_povorotom.jpg',
    'gs10': '1012822855/200x305/c5ba/Mitiko_Aoyama__Kakao_po_chetvergam.jpg',
    'gs11': '1015813186/200x305/f18b/Mitiko_Aoyama__Ponedelnik_v_matchakafe.jpg',
    'gs15': '1008980038/200x305/c8af/Hisasi_Kasivaj__Restoranchik_Kamogava.jpg',
    'gs16': '1009133158/200x305/85f1/Hisasi_Kasivaj__Restoranchik_Kamogava._Zapiski_s_kuhni.jpg',
    'gs17': '1009879276/200x305/261f/Hisasi_Kasivaj__Restoranchik_Kamogava._Zabytye_retsepty.jpg',
    'gs18': '1010164270/200x305/a73b/Kejgo_Higasino__Magazin_chudes_Namiya.jpg',
    'gs19': '1016060728/200x305/d96a/Sjo_Isida__Vam_propisana_koshka.jpg',
    'gs20': '1003995439/200x305/86a6/Tosikadzu_Kavaguti__Poka_ne_ostyl_kofe.jpg',
    'gs21': '1007337421/200x305/6720/Tosikadzu_Kavaguti__Kofe_esche_ne_ostyl._Novye_istorii_iz_volshebnogo_kafe.jpg',
    'gs22': '1010760188/200x305/2e7d/Tosikadzu_Kavaguti__Poka_ty_pomnish._Istorii_iz_volshebnogo_kafe.jpg',
    'gs23': '1012837816/200x305/c2a7/Tosikadzu_Kavaguti__Prezhde_chem_my_poproschaemsya._Novye_istorii_iz_volshebnogo.jpg',
    'gs24': '1010700872/200x305/64cc/Nagi_Simeno__Ryzhij_kot_Futa_iz_kafe_mezhdu_mirami.jpg',
    'gs25': '1014767767/200x305/ca0e/Nagi_Simeno__Ryzhij_kot_Futa_i_zateryannyj_domik_v_gorah.jpg',
    'gs26': '1010167849/200x305/5201/Satosi_Yagisava__Dni_v_knizhnom_Morisaki.jpg',
    'gs27': '1010167855/200x305/4f38/Satosi_Yagisava__Vechera_v_knizhnom_Morisaki.jpg',
    'gs30': '1012690558/200x305/00dc/Yuta_Takahasi__Kotenok_i_kafe_na_krayu_okeana.jpg',
    'gs31': '1017135730/200x305/a280/Hijoko_Kurisu__Lunnaya_pochtovaya_sluzhba.jpg',
    'gs32': '1013780011/200x305/d16a/Hijoko_Kurisu__Lavka_sladostej_na_Sumerechnoj_allee.jpg',
    'gs33': '1013203216/200x305/bf6d/Aono_Kei__Devushka_iz_knizhnogo.jpg',
    'gs34': '1013544667/200x305/430e/Kavakami_Tetsuya_Tetsuya_Kavakami__Chto_ya_uznala_v_knizhnom_Kobayasi.jpg',
    'gs36': '1017030004/200x305/8b6e/Savako_Natori___Knizhnyj_magazinchik_po_pyatnitsam._Vesna.jpg',
    'gs37': '1017807574/200x305/7c8b/Kairi_Aotsuki___Knizhnaya_lavka_s_aromatom_kofe.jpg',
    'gs38': '1010036269/200x305/7458/Mai_Motidzuki__Koshache_kafe_quotPolnoluniequot.jpg',
    'gs39': '1017135361/200x305/367c/Durian_Sukegava__Koty_Sindzyuku.jpg',
    'gs40': '1012375037/200x305/18fb/Durian_Sukegava__Bobovye_slasti.jpg',
    'gs41': '1012409180/200x305/95fd/Sitiri_Nakayama__Sprosite_u_babushki_Sidzuki.jpg',
    'gs42': '1013544652/200x305/261f/Sitiri_Nakayama__Babushka_Sidzuka_i_hudshij_v_mire_naparnik.jpg',
    'gs43': '1013739250/200x305/ef15/Tokuya_Higasigava__Detektiv_za_obedom._Ubijstvo_podayut_goryachim.jpg',
    'gs44': '1018553830/200x305/09fd/Sosuke_Natsukava__Kot_kotoryj_lyubil_knigi.jpg',
    'gs45': '1017733573/200x305/1bf6/Kaho_Nasiki__Vedma_Zapada_mertva.jpg',
    'gs46': '1015711198/200x305/1f57/Joko_Mure__Dni_hleba_supa_i_kotov.jpg',
    'gs47': '1017786460/200x305/0dca/Kenji_Ueda___Magazinchik_nuzhnyh_slov.jpg',
    'gs48': '1009478695/200x305/7cf7/Yumi_Kaneko__Podvodnaya_biblioteka.jpg',
    'gs49': '1016927830/200x305/9f78/Genki_Kavamura__Vyhod_8._Odno_reshenie_mozhet_izmenit_vse.jpg',
    'gs50': '1007407993/200x305/12df/Sonoko_Matida__Pesn_odinokih_kitov_na_chastote_52_Gts.jpg',
    'gs51': '1007466988/200x305/bbaf/Midzuki_Tsudzimura__Odinokij_zamok_v_zazerkale.jpg',
    'gs52': '1007663113/200x305/0558/Sejsyu_Hase__Malchik_i_pjos.jpg',
    'gs53': '1010700383/200x305/0146/Ayano_Takeda__Zvuchi_eufonium_Dobro_pozhalovat_v_duhovoj_orkestr_starshej_shkoly.jpg',
    'gs54': '1018362898/200x305/90f3/Sanaka_Hiiragi__Fotoatele_gospodina_Hirasaki.jpg',
    'gs55': '1016062093/200x305/271b/Hika_Harada__Dnevnik_prestuplenij_Kiriko.jpg',
}
f = json.load(open('demo_fixes.json', encoding='utf-8'))
for k, v in M.items():
    f.setdefault(k, {})['cover'] = C + v
json.dump(f, open('demo_fixes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(M))
