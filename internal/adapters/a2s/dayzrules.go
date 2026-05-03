package a2s

import (
	"bytes"
	"encoding/binary"
	"io"
	"math/bits"
	"sort"
	"strconv"
)

type ruleKV struct {
	k []byte
	v []byte
}

func applyDayzRuleEscapes(bin []byte) []byte {
	bin = bytes.ReplaceAll(bin, []byte{0x01, 0x02}, []byte{0x00})
	bin = bytes.ReplaceAll(bin, []byte{0x01, 0x03}, []byte{0xFF})
	bin = bytes.ReplaceAll(bin, []byte{0x01, 0x01}, []byte{0x01})
	return bin
}

func dayzRulesDecodeWorkshopIDs(pairs []ruleKV) ([]string, error) {
	var binItems []struct {
		key int
		val []byte
	}
	for _, p := range pairs {
		if len(p.k) == 2 {
			ki := int(uint16(p.k[0]) | uint16(p.k[1])<<8)
			binItems = append(binItems, struct {
				key int
				val []byte
			}{ki, append([]byte(nil), p.v...)})
		}
	}
	if len(binItems) == 0 {
		return nil, nil
	}
	sort.Slice(binItems, func(i, j int) bool { return binItems[i].key < binItems[j].key })
	var bin []byte
	for _, x := range binItems {
		bin = append(bin, x.val...)
	}
	bin = applyDayzRuleEscapes(bin)
	r := bytes.NewReader(bin)
	if _, err := r.ReadByte(); err != nil {
		return nil, err
	}
	if _, err := r.ReadByte(); err != nil {
		return nil, err
	}
	var dlcFlagsBuf [2]byte
	if _, err := io.ReadFull(r, dlcFlagsBuf[:]); err != nil {
		return nil, err
	}
	dlcFlags := binary.LittleEndian.Uint16(dlcFlagsBuf[:])
	for range bits.OnesCount16(dlcFlags) {
		var dlc [4]byte
		if _, err := io.ReadFull(r, dlc[:]); err != nil {
			return nil, err
		}
	}
	modsCount, err := r.ReadByte()
	if err != nil {
		return nil, err
	}
	mc := int(modsCount)
	if mc > 512 {
		mc = 512
	}
	out := make([]string, 0, mc)
	for i := 0; i < mc; i++ {
		var hash [4]byte
		if _, err := io.ReadFull(r, hash[:]); err != nil {
			return out, nil
		}
		wlen, err := r.ReadByte()
		if err != nil {
			return out, nil
		}
		n := int(wlen & 0x0F)
		idBytes := make([]byte, n)
		if n > 0 {
			if _, err := io.ReadFull(r, idBytes); err != nil {
				return out, nil
			}
		}
		var wid uint64
		for j := 0; j < n; j++ {
			wid |= uint64(idBytes[j]) << (8 * j)
		}
		slen, err := r.ReadByte()
		if err != nil {
			return out, nil
		}
		if slen > 0 {
			if _, err := io.CopyN(io.Discard, r, int64(slen)); err != nil {
				return out, nil
			}
		}
		if wid > 0 {
			out = append(out, strconv.FormatUint(wid, 10))
		}
	}
	return out, nil
}

func DayzWorkshopIDsFromRulesResult(r RulesResult) []string {
	if len(r.ModWorkshopIDs) > 0 {
		return r.ModWorkshopIDs
	}
	if len(r.Pairs) == 0 {
		return nil
	}
	pairs := make([]ruleKV, 0, len(r.Pairs))
	for k, v := range r.Pairs {
		pairs = append(pairs, ruleKV{k: []byte(k), v: []byte(v)})
	}
	ids, err := dayzRulesDecodeWorkshopIDs(pairs)
	if err != nil || len(ids) == 0 {
		return WorkshopIDsFromRules(r)
	}
	return ids
}
